import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 64 },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minimumOrderValue: { type: Number, default: 0, min: 0 },
    maximumDiscount: { type: Number, default: null, min: 0 },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    usageLimit: { type: Number, default: null, min: 1 },
    perUserUsageLimit: { type: Number, default: 1, min: 1 },
    oneTimeUse: { type: Boolean, default: true },
    applicableUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    usageCount: { type: Number, default: 0, min: 0 },
    isReferralRewardTemplate: { type: Boolean, default: false },
    isReferralReward: { type: Boolean, default: false },
    rewardReason: { type: String, trim: true, maxlength: 80, default: "" },
    referralMinimumOrderValue: { type: Number, default: 0, min: 0 },
    rewardValidityDays: { type: Number, default: 30, min: 1, max: 365 },
    sourceReferralId: { type: mongoose.Schema.Types.ObjectId, ref: "Referral", unique: true, sparse: true },
    sourceQualifyingOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "order", default: null }
}, { timestamps: true });

couponSchema.index(
    { isReferralRewardTemplate: 1 },
    { unique: true, partialFilterExpression: { isReferralRewardTemplate: true, isActive: true } }
);

export default mongoose.model("coupon", couponSchema);
