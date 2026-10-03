import mongoose from "mongoose";

const referralSchema = new mongoose.Schema({
    inviterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    referralCode: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Rewarded"], default: "Pending" },
    qualifyingOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "order", default: null },
    latestOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "order", default: null },
    rewardCouponId: { type: mongoose.Schema.Types.ObjectId, ref: "coupon", default: null },
    rewardedAt: { type: Date, default: null }
}, { timestamps: true });

referralSchema.index({ inviterId: 1, referredUserId: 1 }, { unique: true });
referralSchema.index({ qualifyingOrderId: 1 }, { unique: true, sparse: true });

export default mongoose.model("referral", referralSchema);
