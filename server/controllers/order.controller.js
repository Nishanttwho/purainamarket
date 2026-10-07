import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js"
import dotenv from "dotenv";
import Stripe from "../config/stripe.js";
import { pricewithDiscount } from "../utils/PriceWithDiscount.js";
import { getLooseDiscountedPricePerKg, getLoosePricePerKg } from "../utils/loosePricing.js";
import CartProductModel from "../models/cartProduct.model.js";
import AddressModel from "../models/address.model.js";
import razorpayInstance from "../utils/razorpayConfig.js";
import crypto from "crypto";
import { getCouponForCheckout, reserveCouponForOrder, releaseCouponReservation, commitCouponReservation, CouponValidationError } from "../utils/couponService.js";
import { ensureStoreCanAcceptOrders } from "../utils/storeAvailability.js";
import { calculateCheckoutCharges } from "../utils/deliveryCharges.js";
// import Stripe from "../config/stripe.js";

dotenv.config(); // Load environment variables
class CheckoutValidationError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const money = (value) => Number(Number(value).toFixed(2));
const generateOrderId = () => {
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const now = new Date();
    return `ORD${randomNumber}${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear().toString().slice(-2)}`;
};

// All order amounts are derived here from the authenticated user's persisted cart
// and the current product records.  Request item and price fields are deliberately
// never used by the checkout endpoints.
export const buildCheckout = async (userId, deliveryAddressId, couponCode = "", { allowMissingAddress = false, orderId = "" } = {}) => {
    if (!deliveryAddressId && !allowMissingAddress) throw new CheckoutValidationError("Delivery address is required");

    const address = deliveryAddressId
        ? await AddressModel.findOne({ _id: deliveryAddressId, userId }).select("_id area")
        : null;
    if (deliveryAddressId && !address) throw new CheckoutValidationError("Delivery address was not found for this user", 403);

    const cartItems = await CartProductModel.find({ userId }).populate("productId");
    if (!cartItems.length) throw new CheckoutValidationError("Cart is empty");

    const stockRequired = new Map();
    const itemList = cartItems.map((cartItem) => {
        const product = cartItem.productId;
        if (!product || !product.publish) throw new CheckoutValidationError("A product in your cart is no longer available");

        const sellingType = product.sellingType || "packed";
        let quantity = 1;
        let purchaseMode = null;
        let selectedWeightKg = null;
        let amount = null;
        let linePrice;
        let stockAmount;

        if (sellingType === "loose") {
            const config = product.looseConfig || {};
            const baseRate = getLoosePricePerKg(product);
            if (!Number.isFinite(baseRate) || baseRate <= 0) throw new CheckoutValidationError(`${product.name} has no valid price per kg`);
            const rate = getLooseDiscountedPricePerKg(product);
            if (!Number.isFinite(rate) || rate <= 0) throw new CheckoutValidationError(`${product.name} has no valid sale price per kg`);
            purchaseMode = cartItem.purchaseMode;

            if (purchaseMode === "weight") {
                selectedWeightKg = Number(cartItem.selectedWeightKg);
                const isPreset = (config.presetWeightsKg || []).some((weight) => Number(weight) === selectedWeightKg);
                if (!Number.isFinite(selectedWeightKg) || selectedWeightKg <= 0 || (!isPreset && !config.allowCustomWeight)) {
                    throw new CheckoutValidationError(`The selected weight for ${product.name} is no longer available`);
                }
                linePrice = money(selectedWeightKg * rate);
            } else if (purchaseMode === "amount") {
                amount = Number(cartItem.amount);
                if (!config.allowAmount || !Number.isFinite(amount) || amount <= 0) {
                    throw new CheckoutValidationError(`The selected amount for ${product.name} is no longer available`);
                }
                selectedWeightKg = Number((amount / rate).toFixed(3));
                linePrice = money(amount);
            } else {
                throw new CheckoutValidationError(`Choose a valid weight or amount for ${product.name}`);
            }
            stockAmount = selectedWeightKg;
        } else {
            quantity = Number(cartItem.quantity);
            if (!Number.isInteger(quantity) || quantity < 1) throw new CheckoutValidationError(`Invalid quantity for ${product.name}`);
            const price = Number(product.price);
            if (!Number.isFinite(price) || price < 0) throw new CheckoutValidationError(`${product.name} has no valid price`);
            linePrice = money(pricewithDiscount(price, Number(product.discount) || 0) * quantity);
            stockAmount = quantity;
        }

        const productKey = product._id.toString();
        stockRequired.set(productKey, (stockRequired.get(productKey) || 0) + stockAmount);
        return { productId: product._id, quantity, sellingType, purchaseMode, selectedWeightKg, amount, linePrice, product };
    });

    for (const item of itemList) {
        const stock = item.product.stock;
        const required = stockRequired.get(item.product._id.toString());
        if (stock !== null && (!Number.isFinite(Number(stock)) || Number(stock) < required)) {
            throw new CheckoutValidationError(`Insufficient stock for ${item.product.name}`);
        }
    }

    const subTotalAmt = money(itemList.reduce((total, item) => total + item.linePrice, 0));
    const charges = await calculateCheckoutCharges({ address, itemList, subTotalAmt });
    let coupon = null;
    try {
        coupon = await getCouponForCheckout(couponCode, userId, subTotalAmt, { orderId });
    } catch (error) {
        if (error instanceof CouponValidationError) throw new CheckoutValidationError(error.message, error.status);
        throw error;
    }
    const couponDiscount = coupon?.discountAmount || 0;
    const totalAmt = money(subTotalAmt + charges.deliveryCharge + charges.handlingCharge - couponDiscount);
    return { addressId: address?._id || null, itemList, subTotalAmt, deliveryFee: charges.deliveryCharge, deliverySavings: charges.deliverySavings, handlingCharge: charges.handlingCharge, deliveryArea: charges.deliveryArea, estimatedDeliveryMinutes: charges.estimatedDeliveryMinutes, freeDelivery: charges.freeDelivery, freeDeliveryMinimumOrderValue: charges.freeDeliveryMinimumOrderValue, coupon, couponDiscount, totalAmt };
};

export const getCheckoutQuoteController = async (req, res) => {
    try {
        if (!req.userId) throw new CheckoutValidationError("Please sign in to view checkout charges.", 401);
        const checkout = await buildCheckout(req.userId, req.body?.delivery_address_id, req.body?.couponCode || "", { allowMissingAddress: !req.body?.delivery_address_id });
        return res.json({ success: true, error: false, data: {
            subTotalAmt: checkout.subTotalAmt,
            couponDiscount: checkout.couponDiscount,
            deliveryCharge: checkout.deliveryFee,
            handlingCharge: checkout.handlingCharge,
            totalAmt: checkout.totalAmt,
            deliveryAreaName: checkout.deliveryArea?.name || "",
            estimatedDeliveryMinutes: checkout.estimatedDeliveryMinutes,
            freeDelivery: checkout.freeDelivery,
            deliverySavings: checkout.deliverySavings,
            freeDeliveryMinimumOrderValue: checkout.freeDeliveryMinimumOrderValue
        } });
    } catch (error) { return checkoutError(res, error); }
};

const persistedItems = (itemList) => itemList.map(({ product, ...item }) => item);
const checkoutError = (res, error) => res.status(Number.isInteger(error?.status) ? error.status : 500).json({
    message: error.message || "Something went wrong",
    ...(error.code ? { code: error.code } : {}),
    error: true,
    success: false
});
export const createCashOnDeliveryOrderController = async (req, res) => {
    let orderId;
    let checkout;
    let couponReservation;
    try {
        const userId = req.userId;
        if (!userId) throw new CheckoutValidationError("Please login to access this endpoint.", 401);
        await ensureStoreCanAcceptOrders();
        orderId = generateOrderId();
        checkout = await buildCheckout(userId, req.body.delivery_address_id, req.body.couponCode);
        if (checkout.coupon) {
            couponReservation = await reserveCouponForOrder({
                coupon: checkout.coupon.coupon,
                userId,
                orderId,
                discountAmount: checkout.couponDiscount
            });
        }
        const newOrder = new OrderModel({
            userId,
            orderId,
            itemList: persistedItems(checkout.itemList),
            paymentId: "",
            delivery_address: checkout.addressId,
            subTotalAmt: checkout.subTotalAmt,
            totalAmt: checkout.totalAmt,
            order_status: "Pending",
            invoice_receipt: "",
            delivery_time: checkout.estimatedDeliveryMinutes,
            payment_type: "Cash on Delivery",
            paymentStatus: "COD Pending",
            otherCharge: money(checkout.deliveryFee + checkout.handlingCharge),
            deliveryCharge: checkout.deliveryFee,
            deliverySavings: checkout.deliverySavings,
            freeDelivery: checkout.freeDelivery,
            handlingCharge: checkout.handlingCharge,
            deliveryAreaName: checkout.deliveryArea?.name || "",
            freeDeliveryMinimumOrderValue: checkout.freeDeliveryMinimumOrderValue,
            statusHistory: [{ status: "Pending", reason: "Order placed", changedBy: userId }],
            couponId: checkout.coupon?.coupon?._id || null,
            couponCode: checkout.coupon?.coupon?.code || "",
            couponDiscount: checkout.couponDiscount
        });
        try {
            await newOrder.save();
        } catch (error) {
            if (couponReservation) await releaseCouponReservation(orderId);
            throw error;
        }
        await CartProductModel.deleteMany({ userId });

        return res.status(201).json({
            message: "Order placed successfully",
            success: true,
            order: newOrder
        });

    } catch (error) {
        if (couponReservation) await releaseCouponReservation(orderId);
        return checkoutError(res, error);
    }
};

export const createStripePaymentOrderController = async (req, res) => {
    try {
        await ensureStoreCanAcceptOrders();
        if (!Stripe) {
            throw new CheckoutValidationError("Stripe is not configured for this environment.", 503);
        }
        const userId = req.userId;
        if (!userId) throw new CheckoutValidationError("Please login to access this endpoint.", 401);
        const user = await UserModel.findById(userId);
        if (!user) throw new CheckoutValidationError("User does not exist.", 401);
        const checkout = await buildCheckout(userId, req.body.delivery_address_id);
        const orderId = generateOrderId();
        const line_items = checkout.itemList.map((item) => ({
            price_data: {
                currency: "inr",
                product_data: {
                    name: item.product.name,
                    images: item.product.image,
                    metadata: {
                        productId: item.product._id.toString()
                    }
                },
                unit_amount: Math.round(item.linePrice * 100),
            },
            adjustable_quantity: { enabled: false },
            quantity: 1
        }));
        if (checkout.deliveryFee > 0) {
            line_items.push({
                price_data: {
                    currency: "inr",
                    product_data: { name: "Delivery fee" },
                    unit_amount: Math.round(checkout.deliveryFee * 100),
                },
                quantity: 1,
            });
        }

        const params = {
            submit_type: "pay",
            mode: "payment",
            payment_method_types: ['card'],
            customer_email: user.email,
            metadata: {
                userId: userId,
                addressId: checkout.addressId.toString(),
                orderId: orderId,
            },
            line_items: line_items,
            success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`
        };

        const session = await Stripe.checkout.sessions.create(params);
        return res.status(200).json(session)
    } catch (error) {
        return checkoutError(res, error);
    }
};

//Stripe webhook
//http://localhost:8080/api/order/webhook
export const stripeWebhookPayment = async (req, res) => {
    if (!Stripe) {
        return res.status(503).json({ received: false, message: "Stripe is not configured." });
    }
    const event = req.body;
    if (event.type !== "checkout.session.completed") return res.json({ received: true });
    try {
        const session = event.data.object;
        const { userId, addressId, orderId } = session.metadata || {};
        const checkout = await buildCheckout(userId, addressId);
        if (Math.round(checkout.totalAmt * 100) !== session.amount_total) {
            throw new CheckoutValidationError("Paid amount does not match the server checkout total");
        }
        const existingOrder = await OrderModel.findOne({ paymentId: session.payment_intent });
        if (existingOrder) return res.json({ received: true });
        const newOrder = await OrderModel.create({
            userId,
            orderId,
            itemList: persistedItems(checkout.itemList),
            paymentId: session.payment_intent,
            delivery_address: checkout.addressId,
            subTotalAmt: checkout.subTotalAmt,
            totalAmt: checkout.totalAmt,
            order_status: "Pending",
            invoice_receipt: "",
            payment_type: "Stripe",
            paymentStatus: "Paid",
            otherCharge: money(checkout.deliveryFee + checkout.handlingCharge),
            deliveryCharge: checkout.deliveryFee,
            deliverySavings: checkout.deliverySavings,
            freeDelivery: checkout.freeDelivery,
            handlingCharge: checkout.handlingCharge,
            deliveryAreaName: checkout.deliveryArea?.name || "",
            freeDeliveryMinimumOrderValue: checkout.freeDeliveryMinimumOrderValue,
            delivery_time: checkout.estimatedDeliveryMinutes || null
        });
        await CartProductModel.deleteMany({ userId });
        return res.status(201).json({ message: "Order placed successfully", error: false, success: true, order: newOrder });
    } catch (error) {
        return checkoutError(res, error);
    }
}

export const razorpayPaymentOrderController = async (req, res) => {
    let couponReservation;
    let checkoutOrderId;
    try {
        const userId = req.userId;
        if (!userId) throw new CheckoutValidationError("Please login to access this endpoint.", 401);
        await ensureStoreCanAcceptOrders();
        const user = await UserModel.findById(userId);
        if (!user) throw new CheckoutValidationError("User does not exist.", 401);
        checkoutOrderId = generateOrderId();
        const checkout = await buildCheckout(userId, req.body.delivery_address_id, req.body.couponCode, { orderId: checkoutOrderId });
        if (checkout.coupon) {
            couponReservation = await reserveCouponForOrder({
                coupon: checkout.coupon.coupon,
                userId,
                orderId: checkoutOrderId,
                discountAmount: checkout.couponDiscount
            });
        }
        const options = {
            amount: Math.round(checkout.totalAmt * 100),
            currency: "INR",
            receipt: user.email,
            payment_capture: 1,
            notes: {
                userId: userId.toString(),
                delivery_address_id: checkout.addressId.toString(),
                orderId: checkoutOrderId,
                couponCode: checkout.coupon?.coupon?.code || "",
                couponId: checkout.coupon?.coupon?._id.toString() || "",
                couponDiscount: checkout.couponDiscount.toFixed(2)
            }
        };
        let order;
        try {
            order = await razorpayInstance.orders.create(options);
        } catch (error) {
            if (couponReservation) await releaseCouponReservation(checkoutOrderId);
            throw error;
        }

        return res.status(200).json({
            message: "Razorpay order created successfully",
            error: false,
            success: true,
            order
        });

    } catch (error) {
        if (couponReservation) await releaseCouponReservation(checkoutOrderId);
        return checkoutError(res, error);
    }
};

export const razorpayPaymentVerification = async (req, res) => {
    try {
        const { paymentResponse } = req.body;

        if (!req.userId || !paymentResponse) {
            return res.status(400).json({
                message: "Missing payment response or authenticated user",
                error: true,
                success: false,
            });
        }

        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = paymentResponse;
        if (typeof razorpay_payment_id !== "string" || !/^pay_[A-Za-z0-9]+$/.test(razorpay_payment_id)
            || typeof razorpay_order_id !== "string" || !/^order_[A-Za-z0-9]+$/.test(razorpay_order_id)
            || typeof razorpay_signature !== "string" || !/^[a-fA-F0-9]{64}$/.test(razorpay_signature)) {
            return res.status(400).json({
                message: "Invalid payment details",
                error: true,
                success: false,
            });
        }

        // Verify payment signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        if (!process.env.RAZORPAY_SECRET_KEY) {
            throw new CheckoutValidationError("Razorpay is not configured for this environment.", 503);
        }
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
            .update(body)
            .digest("hex");
        if (!crypto.timingSafeEqual(Buffer.from(expectedSignature, "hex"), Buffer.from(razorpay_signature, "hex"))) {
            return res.status(400).json({
                message: "Payment verification failed",
                error: true,
                success: false,
            });
        }

        const gatewayOrder = await razorpayInstance.orders.fetch(razorpay_order_id);
        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
        if (gatewayOrder.id !== razorpay_order_id || payment.id !== razorpay_payment_id || payment.order_id !== gatewayOrder.id) {
            throw new CheckoutValidationError("Payment does not match the Razorpay order");
        }
        if (payment.status !== "captured" || payment.amount !== gatewayOrder.amount || payment.currency !== gatewayOrder.currency) {
            throw new CheckoutValidationError("Razorpay payment is not captured for the expected amount");
        }

        const notes = gatewayOrder.notes || {};
        if (notes.userId !== req.userId.toString() || !notes.delivery_address_id || !notes.orderId) {
            throw new CheckoutValidationError("Payment order does not belong to this user", 403);
        }
        const existingOrder = await OrderModel.findOne({ paymentId: razorpay_payment_id });
        if (existingOrder) {
            const sameOwner = existingOrder.userId.toString() === req.userId.toString();
            const sameOrder = existingOrder.orderId === notes.orderId;
            const alreadyPaid = existingOrder.payment_type === "Razorpay" && existingOrder.paymentStatus === "Paid";
            const sameAmount = Math.round(existingOrder.totalAmt * 100) === gatewayOrder.amount;
            if (!sameOwner || !sameOrder || !alreadyPaid || !sameAmount) {
                throw new CheckoutValidationError("Payment is already associated with another order", 409);
            }
            return res.status(200).json({ message: "Payment already processed", error: false, success: true });
        }

        const checkout = await buildCheckout(req.userId, notes.delivery_address_id, notes.couponCode || "", { orderId: notes.orderId });
        const expectedCouponId = checkout.coupon?.coupon?._id.toString() || "";
        const hasMatchingCoupon = (notes.couponId || "") === expectedCouponId
            && Number(notes.couponDiscount || 0) === checkout.couponDiscount;
        if ((notes.couponCode && !checkout.coupon?.reservation) || !hasMatchingCoupon
            || gatewayOrder.currency !== "INR" || gatewayOrder.amount !== Math.round(checkout.totalAmt * 100)) {
            throw new CheckoutValidationError("Paid amount does not match the server checkout total");
        }
        // Save new order
        const newOrder = new OrderModel({
            userId: req.userId,
            orderId: notes.orderId,
            itemList: persistedItems(checkout.itemList),
            paymentId: razorpay_payment_id,
            delivery_address: checkout.addressId,
            subTotalAmt: checkout.subTotalAmt,
            totalAmt: checkout.totalAmt,
            order_status: "Pending", // Default status
            invoice_receipt: "",
            delivery_time: checkout.estimatedDeliveryMinutes,
            payment_type: "Razorpay",
            paymentStatus: "Paid",
            otherCharge: money(checkout.deliveryFee + checkout.handlingCharge),
            deliveryCharge: checkout.deliveryFee,
            deliverySavings: checkout.deliverySavings,
            freeDelivery: checkout.freeDelivery,
            handlingCharge: checkout.handlingCharge,
            deliveryAreaName: checkout.deliveryArea?.name || "",
            freeDeliveryMinimumOrderValue: checkout.freeDeliveryMinimumOrderValue,
            statusHistory: [{ status: "Pending", reason: "Order placed", changedBy: req.userId }],
            couponId: checkout.coupon?.coupon?._id || null,
            couponCode: checkout.coupon?.coupon?.code || "",
            couponDiscount: checkout.couponDiscount
        });

        // console.log("🟢 newOrder:", newOrder);

        await newOrder.save();
        if (checkout.coupon) await commitCouponReservation(notes.orderId);
        await CartProductModel.deleteMany({ userId: req.userId });

        return res.status(200).json({
            message: "Payment successful",
            error: false,
            success: true,
        });

    } catch (error) {
        return checkoutError(res, error);
    }
};

export const getOrdersController = async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                message: "Please loging to access this endpoint.",
                success: false,
                error: true
            });
        }

        const orders = await OrderModel.find({ userId })
            .populate("itemList.productId")
            .populate("delivery_address")
            .sort({ createdAt: -1 }); // Sorting by newest first
    

        return res.status(200).json({
            message: "Orders fetched successfully.",
            success: true,
            orders
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
            success: false
        });
    }
};

export const getAllOrdersController = async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                message: "Please log in to access this endpoint.",
                success: false,
                error: true
            });
        }

        const user = await UserModel.findById(userId).lean();

        if (!user) {
            return res.status(401).json({
                message: "User does not exist.",
                success: false,
                error: true
            });
        }

        if (user.role.toLowerCase() !== "admin") {
            return res.status(403).json({
                message: "Only admins can access this endpoint.",
                success: false,
                error: true
            });
        }

        // Fetch all orders
        const orders = await OrderModel.find()
            .populate("userId", "name email mobile")
            .populate("riderId", "name mobile")
            .populate("itemList.productId")
            .populate("delivery_address")
            .sort({ createdAt: -1 }); // Sorting by newest first


        return res.status(200).json({
            message: "Orders fetched successfully.",
            success: true,
            orders
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        return res.status(500).json({
            message: error.message || "Something went wrong",
            success: false
        });
    }
};

export const updateOrderStatusController = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, order_status } = req.body;
        const cancellationReason = typeof req.body?.cancellationReason === "string" ? req.body.cancellationReason.trim().slice(0, 500) : "";

        // Check if user is logged in
        if (!userId) {
            return res.status(401).json({
                message: "Please log in to access this endpoint.",
                success: false,
                error: true
            });
        }

        // Fetch user details
        const user = await UserModel.findById(userId).lean();
        if (!user) {
            return res.status(401).json({
                message: "User does not exist.",
                success: false,
                error: true
            });
        }

        // Only admin can update order status
        if (user.role.toLowerCase() !== "admin") {
            return res.status(403).json({
                message: "Only admins can access this endpoint.",
                success: false,
                error: true
            });
        }

        // Validate input
        if (!orderId || !order_status) {
            return res.status(400).json({
                message: "Missing orderId or order_status.",
                success: false,
                error: true
            });
        }

        if (order_status === "Delivered") {
            return res.status(403).json({
                message: "Delivery status can only be changed by the rider who accepted the order.",
                success: false,
                error: true
            });
        }

        // Check if the order exists
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                message: "Order not found.",
                success: false,
                error: true
            });
        }

        const transitions = {
            Pending: ["Processing", "Shipped", "Cancelled"],
            Processing: ["Shipped", "Cancelled"],
            Shipped: ["Cancelled"],
            "Out for Delivery": ["Cancelled"],
            Delivered: [],
            Cancelled: [],
            Returned: []
        };
        if (!transitions[order.order_status]?.includes(order_status)) {
            return res.status(409).json({ message: `Cannot change an order from ${order.order_status} to ${order_status}.`, success: false, error: true });
        }
        if (order_status === "Cancelled" && !cancellationReason) {
            return res.status(400).json({ message: "Provide a cancellation reason.", success: false, error: true });
        }

        order.order_status = order_status;
        order.statusHistory.push({ status: order_status, reason: order_status === "Cancelled" ? cancellationReason : "Status updated by admin", changedBy: userId });
        if (order_status === "Cancelled") {
            order.cancellationReason = cancellationReason;
            order.cancelledAt = new Date();
            order.cancelledBy = userId;
        }
        await order.save();
        if (["Cancelled", "Returned"].includes(order_status) && order.couponCode) {
            await releaseCouponReservation(order.orderId);
        }

        return res.status(200).json({
            message: "Order status updated successfully.",
            success: true,
            updatedOrder: order
        });

    } catch (error) {
        console.error("Error updating order status:", error);
        return res.status(500).json({
            message: error.message || "Something went wrong",
            success: false
        });
    }
};

export const getOrderDetailsByIdCOntroller = async (req, res) => {
    try {
        const userId = req.userId;
        const {orderId} = req.body

        if(!userId) { 
            return res.status(401).json({
                message: "Please log in to access this endpoint.",
                success: false,
                error: true
            })
        }

        if(typeof orderId !== "string" || !orderId.trim()) {
            return res.status(400).json({
                message: "OrderId is required",
                success: false,
                error: true
            })
        }

        const user = await UserModel.findById(userId).select("role").lean();
        if (!user) {
            return res.status(401).json({ message: "User does not exist.", success: false, error: true });
        }

        const orderFilter = user.role === "ADMIN" ? { orderId: orderId.trim() } : { orderId: orderId.trim(), userId };
        const order = await OrderModel.find(orderFilter)
            .populate("userId", "name email mobile")
            .populate("riderId", "name mobile")
            .populate("itemList.productId")
            .populate("delivery_address")
            .populate("riderId", "name mobile")

        if(!order.length) {
            return res.status(404).json({
                message: "Order not found",
                success: false,
                error: true
            })
        }

        return res.status(200).json({
            message: "Order details fetched successfully",
            success: true,
            order
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || "Something went wrong",
            error: true,
            success: false
        })
    }
}
