import mongoose from "mongoose";

const couponRedemptionSchema = new mongoose.Schema({
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "coupon", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    discountAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["Reserved", "Used", "Released"], default: "Reserved" },
    usedAt: { type: Date, default: null }
}, { timestamps: true });

couponRedemptionSchema.index({ couponId: 1, userId: 1, orderId: 1 }, { unique: true });

export default mongoose.model("couponRedemption", couponRedemptionSchema);