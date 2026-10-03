import mongoose from "mongoose";

const couponUserUsageSchema = new mongoose.Schema({
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "coupon", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    usageCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

couponUserUsageSchema.index({ couponId: 1, userId: 1 }, { unique: true });

export default mongoose.model("couponUserUsage", couponUserUsageSchema);