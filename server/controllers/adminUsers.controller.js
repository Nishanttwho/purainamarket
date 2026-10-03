import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import OrderModel from "../models/order.model.js";
import CouponModel from "../models/coupon.model.js";
import CouponUserUsageModel from "../models/couponUserUsage.model.js";
import CouponRedemptionModel from "../models/couponRedemption.model.js";
import ReferralModel from "../models/referral.model.js";

const safeUserFields = "name email mobile status role verify_email createdAt";
const escapedRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const listAdminUsersController = async (req, res) => {
    try {
        const search = String(req.query.search || "").trim().slice(0, 100);
        const status = String(req.query.status || "");
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
        const query = { role: "USER" };
        if (["Active", "Inactive", "Suspended"].includes(status)) query.status = status;
        if (search) {
            const pattern = new RegExp(escapedRegex(search), "i");
            const digits = search.replace(/\D/g, "");
            query.$or = [{ name: pattern }, { email: pattern }];
            if (digits) query.$or.push({ mobile: Number(digits) });
        }
        const [users, total] = await Promise.all([
            UserModel.find(query).select(safeUserFields).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            UserModel.countDocuments(query)
        ]);
        return res.status(200).json({ success: true, error: false, data: { users, total, page, limit, pages: Math.ceil(total / limit) } });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to load users." });
    }
};

export const getAdminUserDetailsController = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, error: true, message: "Invalid user." });
        const user = await UserModel.findOne({ _id: req.params.id, role: "USER" }).select(safeUserFields).lean();
        if (!user) return res.status(404).json({ success: false, error: true, message: "Customer not found." });

        const [orders, coupons, usageRows, redemptions, referrals] = await Promise.all([
            OrderModel.find({ userId: user._id }).select("orderId itemList paymentStatus payment_type order_status subTotalAmt totalAmt deliveryCharge handlingCharge couponCode couponDiscount createdAt updatedAt deliveryAreaName delivery_time cancellationReason").populate("itemList.productId", "name image").sort({ createdAt: -1 }).lean(),
            CouponModel.find({ applicableUsers: user._id }).select("code discountType discountValue minimumOrderValue startsAt expiresAt isActive perUserUsageLimit oneTimeUse isReferralReward rewardReason createdAt").sort({ createdAt: -1 }).lean(),
            CouponUserUsageModel.find({ userId: user._id }).select("couponId usageCount").lean(),
            CouponRedemptionModel.find({ userId: user._id }).select("couponId code orderId discountAmount status usedAt createdAt").sort({ createdAt: -1 }).lean(),
            ReferralModel.find({ $or: [{ inviterId: user._id }, { referredUserId: user._id }] })
                .populate("inviterId", "name email")
                .populate("referredUserId", "name email")
                .populate("qualifyingOrderId", "orderId order_status totalAmt")
                .populate("latestOrderId", "orderId order_status totalAmt")
                .populate("rewardCouponId", "code discountType discountValue expiresAt isActive")
                .sort({ createdAt: -1 }).lean()
        ]);
        const couponIds = [...new Set([...coupons.map((coupon) => coupon._id.toString()), ...usageRows.map((row) => row.couponId.toString()), ...redemptions.map((row) => row.couponId.toString())])];
        const couponDetails = couponIds.length ? await CouponModel.find({ _id: { $in: couponIds } }).select("code discountType discountValue minimumOrderValue startsAt expiresAt isActive perUserUsageLimit oneTimeUse isReferralReward rewardReason createdAt").lean() : [];
        const couponById = new Map(couponDetails.map((coupon) => [coupon._id.toString(), coupon]));
        const usageById = new Map(usageRows.map((row) => [row.couponId.toString(), row.usageCount || 0]));
        const redemptionById = new Map(redemptions.filter((row) => row.status === "Used").map((row) => [row.couponId.toString(), row]));
        const now = Date.now();
        const couponRows = couponIds.map((id) => {
            const coupon = couponById.get(id);
            if (!coupon) return null;
            const redemption = redemptionById.get(id);
            const used = Boolean(redemption) || (usageById.get(id) || 0) >= (coupon.perUserUsageLimit || 1);
            const expired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now;
            const status = used ? "Used" : expired ? "Expired" : coupon.isActive ? "Available" : "Inactive";
            return { ...coupon, status, redemption: redemption || null, usageCount: usageById.get(id) || 0 };
        }).filter(Boolean);

        return res.status(200).json({ success: true, error: false, data: { user, orders, coupons: couponRows, redemptions, referrals } });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to load customer details." });
    }
};

export const updateAdminUserStatusController = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, error: true, message: "Invalid user." });
        const status = req.body?.status;
        if (!["Active", "Inactive", "Suspended"].includes(status)) return res.status(400).json({ success: false, error: true, message: "Choose a valid customer account status." });
        const user = await UserModel.findOneAndUpdate({ _id: req.params.id, role: "USER" }, { $set: { status } }, { new: true, runValidators: true }).select(safeUserFields).lean();
        if (!user) return res.status(404).json({ success: false, error: true, message: "Customer not found. Admin and rider accounts cannot be changed here." });
        return res.status(200).json({ success: true, error: false, message: "Customer account status updated.", data: user });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to update customer status." });
    }
};

export const deleteAdminUserController = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, error: true, message: "Invalid user." });
        if (req.params.id === String(req.userId)) return res.status(403).json({ success: false, error: true, message: "You cannot delete your own account here." });
        const user = await UserModel.findOneAndDelete({ _id: req.params.id, role: "USER" }).select("_id");
        if (!user) return res.status(404).json({ success: false, error: true, message: "Customer not found. Admin and rider accounts cannot be deleted here." });
        return res.status(200).json({ success: true, error: false, message: "Customer account deleted. Order and referral history has been retained." });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to delete customer." });
    }
};
