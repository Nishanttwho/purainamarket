import mongoose from "mongoose";
import CouponModel from "../models/coupon.model.js";
import CouponRedemptionModel from "../models/couponRedemption.model.js";
import CouponUserUsageModel from "../models/couponUserUsage.model.js";
import UserModel from "../models/user.model.js";
import { buildCheckout } from "./order.controller.js";

const couponResponseError = (res, error) => res.status(error.status || 500).json({
    success: false,
    error: true,
    message: error.message || "Coupon request failed."
});

const positiveNumberOrNull = (value, label) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) throw Object.assign(new Error(`${label} must be greater than zero.`), { status: 400 });
    return parsed;
};

const dateOrNull = (value, label) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw Object.assign(new Error(`${label} is not a valid date.`), { status: 400 });
    return parsed;
};

const couponDataFromRequest = async (body) => {
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const discountType = body.discountType;
    const discountValue = Number(body.discountValue);
    const startsAt = dateOrNull(body.startsAt, "Start date") || new Date();
    const expiresAt = dateOrNull(body.expiresAt, "Expiry date");
    const minimumOrderValue = Number(body.minimumOrderValue || 0);
    const maximumDiscount = positiveNumberOrNull(body.maximumDiscount, "Maximum discount");
    const usageLimit = positiveNumberOrNull(body.usageLimit, "Total usage limit");
    const oneTimeUse = body.oneTimeUse === true;
    const requestedPerUserLimit = Number(body.perUserUsageLimit || 1);
    const perUserUsageLimit = oneTimeUse ? 1 : requestedPerUserLimit;
    const applicableUsers = Array.isArray(body.applicableUsers) ? body.applicableUsers : [];
    const isReferralRewardTemplate = body.isReferralRewardTemplate === true;
    const referralMinimumOrderValue = Number(body.referralMinimumOrderValue || 0);
    const rewardValidityDays = Number(body.rewardValidityDays || 30);
    const rewardReason = typeof body.rewardReason === "string" ? body.rewardReason.trim().slice(0, 80) : "";

    if (!/^[A-Z0-9_-]{3,64}$/.test(code)) throw Object.assign(new Error("Use 3–64 letters, numbers, dashes, or underscores for the coupon code."), { status: 400 });
    if (!["percentage", "fixed"].includes(discountType)) throw Object.assign(new Error("Choose a percentage or fixed discount."), { status: 400 });
    if (!Number.isFinite(discountValue) || discountValue <= 0 || (discountType === "percentage" && discountValue > 100)) {
        throw Object.assign(new Error("Enter a valid discount value."), { status: 400 });
    }
    if (!Number.isFinite(minimumOrderValue) || minimumOrderValue < 0) throw Object.assign(new Error("Minimum order value cannot be negative."), { status: 400 });
    if (expiresAt && expiresAt <= startsAt) throw Object.assign(new Error("Expiry date must be after the start date."), { status: 400 });
    if (!Number.isInteger(perUserUsageLimit) || perUserUsageLimit < 1) throw Object.assign(new Error("Per-user usage limit must be at least one."), { status: 400 });
    if (!Number.isFinite(referralMinimumOrderValue) || referralMinimumOrderValue < 0) throw Object.assign(new Error("Referral qualifying order value cannot be negative."), { status: 400 });
    if (!Number.isInteger(rewardValidityDays) || rewardValidityDays < 1 || rewardValidityDays > 365) throw Object.assign(new Error("Referral reward validity must be from 1 to 365 days."), { status: 400 });
    if (applicableUsers.some((id) => !mongoose.isValidObjectId(id))) throw Object.assign(new Error("One or more eligible user IDs are invalid."), { status: 400 });
    if (applicableUsers.length) {
        const eligibleCount = await UserModel.countDocuments({ _id: { $in: applicableUsers }, role: "USER" });
        if (eligibleCount !== new Set(applicableUsers.map(String)).size) throw Object.assign(new Error("Coupons can only target existing customer accounts."), { status: 400 });
    }

    return {
        code,
        discountType,
        discountValue,
        minimumOrderValue,
        maximumDiscount,
        startsAt,
        expiresAt,
        isActive: body.isActive !== false,
        usageLimit,
        perUserUsageLimit,
        oneTimeUse,
        applicableUsers,
        isReferralRewardTemplate,
        referralMinimumOrderValue,
        rewardValidityDays,
        rewardReason
    };
};

export const listMyCouponsController = async (req, res) => {
    try {
        const userId = req.userId;
        const coupons = await CouponModel.find({
            isReferralRewardTemplate: { $ne: true },
            $or: [{ applicableUsers: userId }, { applicableUsers: { $size: 0 } }]
        }).sort({ createdAt: -1 }).lean();
        if (!coupons.length) return res.status(200).json({ success: true, error: false, data: [] });
        const couponIds = coupons.map((coupon) => coupon._id);
        const [usageRows, redemptionRows] = await Promise.all([
            CouponUserUsageModel.find({ userId, couponId: { $in: couponIds } }).lean(),
            CouponRedemptionModel.find({ userId, couponId: { $in: couponIds }, status: "Used" }).lean()
        ]);
        const usageByCoupon = new Map(usageRows.map((row) => [row.couponId.toString(), row.usageCount || 0]));
        const usedCoupons = new Set(redemptionRows.map((row) => row.couponId.toString()));
        const now = new Date();
        const data = coupons.map((coupon) => {
            const used = usedCoupons.has(coupon._id.toString()) || (usageByCoupon.get(coupon._id.toString()) || 0) >= (coupon.perUserUsageLimit || 1);
            const expired = !coupon.isActive
                || (coupon.expiresAt && new Date(coupon.expiresAt) <= now)
                || (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit);
            const upcoming = coupon.startsAt && new Date(coupon.startsAt) > now;
            return {
                ...coupon,
                status: used ? "used" : upcoming ? "scheduled" : expired ? "expired" : "available",
                reason: coupon.isReferralReward ? "Referral Reward" : coupon.rewardReason || (coupon.applicableUsers?.length ? "Personal offer" : "Store offer")
            };
        });
        return res.status(200).json({ success: true, error: false, data });
    } catch (error) {
        return couponResponseError(res, error);
    }
};

export const validateCartCouponController = async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ success: false, error: true, message: "Please sign in to apply a coupon." });
        if (typeof req.body?.code !== "string" || !req.body.code.trim()) {
            return res.status(400).json({ success: false, error: true, message: "Enter a coupon code." });
        }
        const checkout = await buildCheckout(req.userId, null, req.body.code, { allowMissingAddress: true });
        return res.status(200).json({
            success: true,
            error: false,
            message: "Coupon applied.",
            data: {
                code: checkout.coupon.coupon.code,
                discountAmount: checkout.couponDiscount,
                subTotalAmt: checkout.subTotalAmt,
                deliveryFee: checkout.deliveryFee,
                totalAmt: checkout.totalAmt
            }
        });
    } catch (error) {
        return couponResponseError(res, error);
    }
};

export const listAdminCouponsController = async (_req, res) => {
    try {
        const coupons = await CouponModel.find().populate("applicableUsers", "name email").sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, error: false, data: coupons });
    } catch (error) {
        return couponResponseError(res, error);
    }
};

export const searchCouponUsersController = async (req, res) => {
    try {
        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
        if (search.length < 2) return res.status(200).json({ success: true, error: false, data: [] });
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const users = await UserModel.find({ role: "USER", $or: [
            { name: { $regex: escaped, $options: "i" } },
            { email: { $regex: escaped, $options: "i" } }
        ] }).select("name email").limit(15).lean();
        return res.status(200).json({ success: true, error: false, data: users });
    } catch (error) {
        return couponResponseError(res, error);
    }
};

export const createAdminCouponController = async (req, res) => {
    try {
        const couponData = await couponDataFromRequest(req.body || {});
        const coupon = await CouponModel.create(couponData);
        return res.status(201).json({ success: true, error: false, message: "Coupon created.", data: coupon });
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ success: false, error: true, message: "That coupon code or referral template already exists." });
        return couponResponseError(res, error);
    }
};

export const updateAdminCouponController = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: true, message: "Invalid coupon ID." });
        const couponData = await couponDataFromRequest(req.body || {});
        const coupon = await CouponModel.findByIdAndUpdate(req.params.id, couponData, { new: true, runValidators: true });
        if (!coupon) return res.status(404).json({ success: false, error: true, message: "Coupon not found." });
        return res.status(200).json({ success: true, error: false, message: "Coupon updated.", data: coupon });
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ success: false, error: true, message: "That coupon code or referral template already exists." });
        return couponResponseError(res, error);
    }
};

export const disableAdminCouponController = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: true, message: "Invalid coupon ID." });
        const coupon = await CouponModel.findByIdAndUpdate(req.params.id, { isActive: false, isReferralRewardTemplate: false }, { new: true });
        if (!coupon) return res.status(404).json({ success: false, error: true, message: "Coupon not found." });
        return res.status(200).json({ success: true, error: false, message: "Coupon deactivated. Existing order history was retained.", data: coupon });
    } catch (error) {
        return couponResponseError(res, error);
    }
};

export const getAdminCouponUsageController = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: true, message: "Invalid coupon ID." });
        const redemptions = await CouponRedemptionModel.find({ couponId: req.params.id }).populate("userId", "name email").sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, error: false, data: redemptions });
    } catch (error) {
        return couponResponseError(res, error);
    }
};
