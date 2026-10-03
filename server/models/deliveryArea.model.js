import mongoose from "mongoose";

const deliveryAreaSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    estimatedDeliveryMinutes: { type: Number, default: 0, min: 0 },
    freeDeliveryMinimumOrderValue: { type: Number, default: null, min: 0 },
    isEnabled: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("deliveryArea", deliveryAreaSchema);
