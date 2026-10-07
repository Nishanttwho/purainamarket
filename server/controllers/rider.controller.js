import mongoose from "mongoose";
import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import { hashPassword } from "../helper/passwordHashng.js";
import { commitCouponReservation, releaseCouponReservation } from "../utils/couponService.js";
import ReferralModel from "../models/referral.model.js";
import CouponModel from "../models/coupon.model.js";

export const getRidersAdminController = async (req, res) => {
    try {
        const riders = await UserModel.find({ role: "RIDER" })
            .select("name email mobile status createdAt")
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({ success: true, error: false, data: riders });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to load rider accounts." });
    }
};

export const createRiderAdminController = async (req, res) => {
    try {
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const password = req.body?.password;
        const mobile = String(req.body?.mobile || "").replace(/\D/g, "");

        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 8 || !/^\d{10}$/.test(mobile)) {
            return res.status(400).json({ success: false, error: true, message: "Provide a name, valid email, 10-digit mobile number, and password of at least 8 characters." });
        }

        const existing = await UserModel.exists({ $or: [{ email }, { mobile: Number(mobile) }] });
        if (existing) {
            return res.status(409).json({ success: false, error: true, message: "That email or mobile number is already registered." });
        }

        const rider = await UserModel.create({
            name,
            email,
            mobile: Number(mobile),
            password: await hashPassword(password),
            role: "RIDER",
            verify_email: true,
            status: "Active"
        });

        return res.status(201).json({
            success: true,
            error: false,
            message: "Rider account created.",
            data: { _id: rider._id, name: rider.name, email: rider.email, mobile: rider.mobile, status: rider.status }
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ success: false, error: true, message: "That email or mobile number is already registered." });
        }
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to create rider account." });
    }
};

const orderQuery = (orderIdentifier) => {
    if (typeof orderIdentifier !== "string" || !orderIdentifier.trim()) return null;
    const value = orderIdentifier.trim();
    return mongoose.isValidObjectId(value) ? { _id: value } : { orderId: value };
};

const populateOrder = (query) => query
    .populate("userId", "name email mobile")
    .populate("riderId", "name email mobile")
    .populate("itemList.productId", "name image unit price pricePerKg priceUnitGrams discount sellingType")
    .populate("delivery_address");

const availableOrderFilter = {
    order_status: { $in: ["Pending", "Processing", "Shipped"] },
    $or: [{ riderId: null }, { riderId: { $exists: false } }]
};

export const getRiderDashboardController = async (req, res) => {
    try {
        const riderId = req.userId;
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const [availableOrders, activeOrders, completedToday] = await Promise.all([
            populateOrder(OrderModel.find(availableOrderFilter).sort({ createdAt: 1 })),
            populateOrder(OrderModel.find({ riderId, order_status: "Out for Delivery" }).sort({ acceptedAt: 1 })),
            populateOrder(OrderModel.find({
                riderId,
                order_status: "Delivered",
                $or: [
                    { deliveredAt: { $gte: dayStart, $lt: dayEnd } },
                    { deliveredAt: null, updatedAt: { $gte: dayStart, $lt: dayEnd } }
                ]
            }).sort({ deliveredAt: -1, updatedAt: -1 }))
        ]);

        const codToCollect = activeOrders.reduce((total, order) => total + (order.payment_type === "Cash on Delivery" && !order.paymentId && order.paymentStatus !== "COD Collected" ? Number(order.totalAmt) || 0 : 0), 0);

        return res.status(200).json({
            success: true,
            error: false,
            data: {
                availableOrders,
                activeOrders,
                activeOrder: activeOrders[0] || null,
                completedToday,
                stats: {
                    availableOrders: availableOrders.length,
                    activeOrder: activeOrders.length,
                    completedToday: completedToday.length,
                    codToCollect
                }
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: true,
            message: error.message || "Unable to load rider dashboard."
        });
    }
};

export const getRiderOrderDetailsController = async (req, res) => {
    try {
        const identifierQuery = orderQuery(req.params.orderId);
        if (!identifierQuery) {
            return res.status(400).json({ success: false, error: true, message: "A valid order ID is required." });
        }

        const order = await populateOrder(OrderModel.findOne({
            ...identifierQuery,
            $or: [
                { riderId: req.userId },
                { cancelledBy: req.userId, order_status: "Cancelled" },
                { ...availableOrderFilter }
            ]
        }));

        if (!order) {
            return res.status(404).json({ success: false, error: true, message: "Order is unavailable or belongs to another rider." });
        }

        return res.status(200).json({ success: true, error: false, data: order });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to load order details." });
    }
};

export const acceptRiderOrderController = async (req, res) => {
    try {
        const identifierQuery = orderQuery(req.params.orderId);
        if (!identifierQuery) {
            return res.status(400).json({ success: false, error: true, message: "A valid order ID is required." });
        }

        const claimed = await OrderModel.findOneAndUpdate(
            { ...identifierQuery, ...availableOrderFilter },
            {
                $set: {
                    riderId: req.userId,
                    acceptedAt: new Date(),
                    order_status: "Out for Delivery"
                }
            },
            { new: true, runValidators: true }
        );

        if (!claimed) {
            return res.status(409).json({ success: false, error: true, message: "This order has already been accepted or is no longer available." });
        }

        const order = await populateOrder(OrderModel.findById(claimed._id));
        return res.status(200).json({ success: true, error: false, message: "Order accepted. It is now out for delivery.", data: order });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ success: false, error: true, message: "You already have an active order." });
        }
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to accept this order." });
    }
};

export const collectRiderCODController = async (req, res) => {
    try {
        const identifierQuery = orderQuery(req.params.orderId);
        if (!identifierQuery) {
            return res.status(400).json({ success: false, error: true, message: "A valid order ID is required." });
        }

        const order = await OrderModel.findOneAndUpdate({
            ...identifierQuery,
            riderId: req.userId,
            order_status: "Out for Delivery",
            payment_type: "Cash on Delivery",
            paymentId: { $in: ["", null] },
            $or: [{ paymentStatus: "COD Pending" }, { paymentStatus: null }]
        }, {
            $set: { paymentStatus: "COD Collected", codCollectedAt: new Date() }
        }, { new: true, runValidators: true });

        if (!order) {
            return res.status(409).json({ success: false, error: true, message: "COD is already collected or this order is not assigned to you." });
        }

        return res.status(200).json({ success: true, error: false, message: "COD collection recorded.", data: order });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to record COD collection." });
    }
};

export const cancelRiderOrderController = async (req, res) => {
    try {
        const identifierQuery = orderQuery(req.params.orderId);
        const reason = typeof req.body?.cancellationReason === "string" ? req.body.cancellationReason.trim().slice(0, 500) : "";
        if (!identifierQuery) return res.status(400).json({ success: false, error: true, message: "A valid order ID is required." });
        if (!reason) return res.status(400).json({ success: false, error: true, message: "Provide a cancellation reason." });
        const order = await OrderModel.findOneAndUpdate({
            ...identifierQuery,
            $or: [
                { riderId: req.userId, order_status: "Out for Delivery" },
                { order_status: { $in: ["Pending", "Processing", "Shipped"] }, $or: [{ riderId: null }, { riderId: { $exists: false } }] }
            ]
        }, {
            $set: { order_status: "Cancelled", cancellationReason: reason, cancelledAt: new Date(), cancelledBy: req.userId },
            $push: { statusHistory: { status: "Cancelled", reason, changedBy: req.userId } }
        }, { new: true, runValidators: true });
        if (!order) return res.status(409).json({ success: false, error: true, message: "This order is no longer available to cancel." });
        if (order.couponCode) await releaseCouponReservation(order.orderId);
        return res.json({ success: true, error: false, message: "Order cancelled.", data: order });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to cancel this order." });
    }
};

export const deliverRiderOrderController = async (req, res) => {
    try {
        const identifierQuery = orderQuery(req.params.orderId);
        if (!identifierQuery) {
            return res.status(400).json({ success: false, error: true, message: "A valid order ID is required." });
        }

        const existingOrder = await OrderModel.findOne({ ...identifierQuery, riderId: req.userId, order_status: "Out for Delivery" });
        if (!existingOrder) {
            return res.status(404).json({ success: false, error: true, message: "Active order not found for this rider." });
        }

        const isCOD = existingOrder.payment_type === "Cash on Delivery" && !existingOrder.paymentId;
        if (isCOD && existingOrder.paymentStatus !== "COD Collected") {
            return res.status(409).json({ success: false, error: true, message: `Record collection of ₹${existingOrder.totalAmt} before completing this COD delivery.` });
        }
        if (!isCOD && existingOrder.paymentStatus !== "Paid" && !existingOrder.paymentId) {
            return res.status(409).json({ success: false, error: true, message: "Payment is not confirmed for this order." });
        }

        const delivered = await OrderModel.findOneAndUpdate({
            _id: existingOrder._id,
            riderId: req.userId,
            order_status: "Out for Delivery"
        }, {
            $set: {
                order_status: "Delivered",
                deliveredAt: new Date(),
                ...(isCOD ? { paymentStatus: "COD Collected" } : { paymentStatus: "Paid" })
            }
        }, { new: true, runValidators: true });

        if (!delivered) {
            return res.status(409).json({ success: false, error: true, message: "This order has already been completed." });
        }

        if (delivered.couponCode) await commitCouponReservation(delivered.orderId);

        const referral = await ReferralModel.findOneAndUpdate(
            { referredUserId: delivered.userId, status: "Pending" },
            { $set: { latestOrderId: delivered._id } },
            { new: true }
        );
        if (referral && Number(delivered.subTotalAmt) >= 0) {
            const template = await CouponModel.findOne({ isReferralRewardTemplate: true, isActive: true });
            if (template && Number(delivered.subTotalAmt) >= Number(template.referralMinimumOrderValue || 0)) {
                const rewardedAt = new Date();
                let rewardCoupon;
                try {
                    rewardCoupon = await CouponModel.create({
                    code: `REF${referral._id.toString().slice(-10).toUpperCase()}`,
                    discountType: template.discountType,
                    discountValue: template.discountValue,
                    minimumOrderValue: template.minimumOrderValue,
                    maximumDiscount: template.maximumDiscount,
                    startsAt: rewardedAt,
                    expiresAt: new Date(rewardedAt.getTime() + Number(template.rewardValidityDays || 30) * 86400000),
                    isActive: true,
                    usageLimit: 1,
                    perUserUsageLimit: 1,
                    oneTimeUse: true,
                    applicableUsers: [referral.inviterId],
                    isReferralReward: true,
                    rewardReason: "Referral Reward",
                    sourceReferralId: referral._id,
                    sourceQualifyingOrderId: delivered._id
                    });
                } catch (error) {
                    if (error?.code !== 11000) throw error;
                    rewardCoupon = await CouponModel.findOne({ sourceReferralId: referral._id });
                }
                await ReferralModel.updateOne({ _id: referral._id, status: "Pending" }, {
                    $set: { status: "Rewarded", qualifyingOrderId: delivered._id, rewardCouponId: rewardCoupon._id, rewardedAt }
                });
            }
        }

        return res.status(200).json({ success: true, error: false, message: "Order marked as delivered.", data: delivered });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to complete this delivery." });
    }
};

export const getRiderHistoryController = async (req, res) => {
    try {
        const orders = await populateOrder(OrderModel.find({
            riderId: req.userId,
            order_status: "Delivered"
        }).sort({ deliveredAt: -1, updatedAt: -1 }));

        return res.status(200).json({ success: true, error: false, data: orders });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to load delivery history." });
    }
};
