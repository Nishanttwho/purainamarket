import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: String,
        required: [true, "Provide orderId"],
        unique: true
    },
    itemList: [
        {
            productId: {
                type: mongoose.Schema.ObjectId,
                ref: "product",
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            sellingType: { type: String, enum: ["packed", "loose"], default: "packed" },
            purchaseMode: { type: String, enum: ["weight", "amount", null], default: null },
            selectedWeightKg: { type: Number, default: null },
            amount: { type: Number, default: null },
            linePrice: { type: Number, default: null }
        }
    ],
    paymentId: {
        type: String,
        default: ""
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "COD Pending", "COD Collected"]
    },
    delivery_address: {
        type: mongoose.Schema.ObjectId,
        ref: 'address',
        required: true
    },
    subTotalAmt: {
        type: Number,
        default: 0
    },
    totalAmt: {
        type: Number,
        default: 0
    },
    otherCharge: {
        type: Number,
        default: 0,
        min: 0
    },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    deliverySavings: { type: Number, default: 0, min: 0 },
    freeDelivery: { type: Boolean, default: false },
    handlingCharge: { type: Number, default: 0, min: 0 },
    deliveryAreaName: { type: String, default: "" },
    freeDeliveryMinimumOrderValue: { type: Number, default: null },
    couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "coupon",
        default: null
    },
    couponCode: {
        type: String,
        default: ""
    },
    couponDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    order_status: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"],
        default: "Pending"
    },
    riderId: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        default: null
    },
    acceptedAt: {
        type: Date,
        default: null
    },
    deliveredAt: {
        type: Date,
        default: null
    },
    codCollectedAt: {
        type: Date,
        default: null
    },
    payment_type: {
        type: String,
        enum: ["Cash on Delivery", "Stripe", "Razorpay"],
        default: "Cash on Delivery",
    },
    invoice_receipt: {
        type: String,
        default: ""
    },
    delivery_time: {
        type: Number,
    },
    cancellationReason: { type: String, default: "", maxlength: 500 },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    statusHistory: [{ status: { type: String }, reason: { type: String, default: "" }, changedAt: { type: Date, default: Date.now }, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null } }]
}, {
    timestamps: true
});

const OrderModel = mongoose.model('order', orderSchema);

export default OrderModel;
