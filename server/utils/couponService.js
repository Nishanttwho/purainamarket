import CouponModel from "../models/coupon.model.js";
import CouponRedemptionModel from "../models/couponRedemption.model.js";
import CouponUserUsageModel from "../models/couponUserUsage.model.js";

export class CouponValidationError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export const normalizeCouponCode = (value) => typeof value === "string" ? value.trim().toUpperCase() : "";

export const calculateCouponDiscount = (coupon, subtotal) => {
    const amount = Number(subtotal);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    let discount = coupon.discountType === "percentage"
        ? amount * Number(coupon.discountValue) / 100
        : Number(coupon.discountValue);
    if (coupon.maximumDiscount !== null && coupon.maximumDiscount !== undefined) {
        discount = Math.min(discount, Number(coupon.maximumDiscount));
    }
    return Number(Math.min(amount, Math.max(0, discount)).toFixed(2));
};

export const getCouponForCheckout = async (codeValue, userId, subtotal, { orderId = "" } = {}) => {
    const code = normalizeCouponCode(codeValue);
    if (!code) return null;
    if (code.length > 64) throw new CouponValidationError("Coupon code is invalid.");

    const existingReservation = orderId
        ? await CouponRedemptionModel.findOne({ orderId, userId, code, status: { $in: ["Reserved", "Used"] } })
        : null;
    const coupon = await CouponModel.findOne({ code });
    if (!coupon) throw new CouponValidationError("Coupon code is not valid.");
    if (existingReservation) {
        return { coupon, discountAmount: Number(existingReservation.discountAmount) || 0, reservation: existingReservation };
    }

    const now = new Date();
    if (!coupon.isActive) throw new CouponValidationError("This coupon is inactive.");
    if (coupon.startsAt && new Date(coupon.startsAt) > now) throw new CouponValidationError("This coupon is not active yet.");
    if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) throw new CouponValidationError("This coupon has expired.");
    if (coupon.isReferralRewardTemplate) throw new CouponValidationError("This coupon is reserved for referral rewards.");
    if (Array.isArray(coupon.applicableUsers) && coupon.applicableUsers.length
        && !coupon.applicableUsers.some((id) => id.toString() === userId.toString())) {
        throw new CouponValidationError("This coupon is not available for your account.");
    }
    if (Number(subtotal) < (Number(coupon.minimumOrderValue) || 0)) {
        throw new CouponValidationError(`Add ₹${(Number(coupon.minimumOrderValue) - Number(subtotal)).toFixed(2)} more to use this coupon.`);
    }
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
        throw new CouponValidationError("This coupon has reached its usage limit.");
    }

    const userUsage = await CouponUserUsageModel.findOne({ couponId: coupon._id, userId });
    if (coupon.perUserUsageLimit && (userUsage?.usageCount || 0) >= coupon.perUserUsageLimit) {
        throw new CouponValidationError("You have already used this coupon the maximum number of times.");
    }

    return { coupon, discountAmount: calculateCouponDiscount(coupon, subtotal), reservation: null };
};

const incrementUserUsage = async (couponId, userId, limit) => {
    const filter = { couponId, userId };
    if (limit) filter.usageCount = { $lt: limit };
    let usage = await CouponUserUsageModel.findOneAndUpdate(filter, { $inc: { usageCount: 1 } }, { new: true });
    if (usage) return usage;

    try {
        return await CouponUserUsageModel.create({ couponId, userId, usageCount: 1 });
    } catch (error) {
        if (error?.code !== 11000) throw error;
        usage = await CouponUserUsageModel.findOneAndUpdate(filter, { $inc: { usageCount: 1 } }, { new: true });
        if (!usage) throw new CouponValidationError("You have already used this coupon the maximum number of times.");
        return usage;
    }
};

export const reserveCouponForOrder = async ({ coupon, userId, orderId, discountAmount }) => {
    if (!coupon) return null;
    const existing = await CouponRedemptionModel.findOne({ orderId });
    if (existing) {
        if (existing.userId.toString() !== userId.toString() || existing.couponId.toString() !== coupon._id.toString()) {
            throw new CouponValidationError("A different coupon is already attached to this order.", 409);
        }
        return existing;
    }

    const couponFilter = { _id: coupon._id, isActive: true };
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) couponFilter.usageCount = { $lt: coupon.usageLimit };
    const reservedCoupon = await CouponModel.findOneAndUpdate(couponFilter, { $inc: { usageCount: 1 } }, { new: true });
    if (!reservedCoupon) throw new CouponValidationError("This coupon has reached its usage limit.");

    let usage;
    try {
        usage = await incrementUserUsage(coupon._id, userId, coupon.perUserUsageLimit || 1);
        return await CouponRedemptionModel.create({
            couponId: coupon._id,
            userId,
            orderId,
            code: coupon.code,
            discountAmount,
            status: "Reserved"
        });
    } catch (error) {
        if (usage) await CouponUserUsageModel.updateOne({ _id: usage._id, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
        await CouponModel.updateOne({ _id: coupon._id, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
        if (error?.code === 11000) throw new CouponValidationError("This coupon has already been used for an order.", 409);
        throw error;
    }
};

export const commitCouponReservation = async (orderId) => CouponRedemptionModel.findOneAndUpdate(
    { orderId, status: "Reserved" },
    { $set: { status: "Used", usedAt: new Date() } },
    { new: true }
);

export const releaseCouponReservation = async (orderId) => {
    const redemption = await CouponRedemptionModel.findOneAndUpdate(
        { orderId, status: "Reserved" },
        { $set: { status: "Released" } },
        { new: true }
    );
    if (!redemption) return null;
    await Promise.all([
        CouponModel.updateOne({ _id: redemption.couponId, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } }),
        CouponUserUsageModel.updateOne({ couponId: redemption.couponId, userId: redemption.userId, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } })
    ]);
    return redemption;
};