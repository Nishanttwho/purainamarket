import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import mongoose from "mongoose";
import { buildCheckout, createCashOnDeliveryOrderController, razorpayPaymentOrderController, razorpayPaymentVerification } from "../controllers/order.controller.js";
import AddressModel from "../models/address.model.js";
import CartProductModel from "../models/cartProduct.model.js";
import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import CouponModel from "../models/coupon.model.js";
import CouponRedemptionModel from "../models/couponRedemption.model.js";
import CouponUserUsageModel from "../models/couponUserUsage.model.js";
import StoreSettingsModel from "../models/storeSettings.model.js";
import CategoryModel from "../models/category.model.js";
import DeliveryAreaModel from "../models/deliveryArea.model.js";
import razorpayInstance from "../utils/razorpayConfig.js";

process.env.RAZORPAY_SECRET_KEY = "test-secret";
const userId = new mongoose.Types.ObjectId();
const addressId = new mongoose.Types.ObjectId();

StoreSettingsModel.findOne = () => ({ lean: async () => ({ manualIsOpen: true }) });
let checkoutCategories = [];
let checkoutArea = null;
CategoryModel.find = () => ({ select() { return this; }, lean: async () => checkoutCategories });
DeliveryAreaModel.findOne = () => ({ lean: async () => checkoutArea });

const mockCheckoutData = ({ address = { _id: addressId }, cart = [] } = {}) => {
    AddressModel.findOne = () => ({ select: async () => address });
    CartProductModel.find = () => ({ populate: async () => cart });
    checkoutCategories = [];
    checkoutArea = null;
};

const product = (overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    name: "Test product",
    publish: true,
    sellingType: "packed",
    price: 100,
    discount: 10,
    stock: 10,
    ...overrides
});

test("rebuilds a packed order and ignores client totals", async () => {
    const itemProduct = product();
    mockCheckoutData({ cart: [{ productId: itemProduct, quantity: 2, linePrice: 0 }] });
    const checkout = await buildCheckout(userId, addressId);
    assert.equal(checkout.itemList[0].linePrice, 180);
    assert.equal(checkout.subTotalAmt, 180);
    assert.equal(checkout.deliveryFee, 30);
    assert.equal(checkout.totalAmt, 210);
});

test("packed discount pricing is consistent for a 160 rupee product at 20 percent off", async () => {
    mockCheckoutData({ cart: [{ productId: product({ price: 160, discount: 20 }), quantity: 1, linePrice: 160 }] });
    const checkout = await buildCheckout(userId, addressId);
    assert.equal(checkout.itemList[0].linePrice, 128);
    assert.equal(checkout.subTotalAmt, 128);
});

test("recalculates loose weight and amount orders using the product rate", async () => {
    const byWeight = product({ sellingType: "loose", pricePerKg: 200, discount: 10, looseConfig: { presetWeightsKg: [0.5], allowCustomWeight: false, allowAmount: true }, stock: 2 });
    const byAmount = product({ sellingType: "loose", pricePerKg: 100, discount: 0, looseConfig: { presetWeightsKg: [], allowCustomWeight: true, allowAmount: true }, stock: 2 });
    mockCheckoutData({ cart: [
        { productId: byWeight, purchaseMode: "weight", selectedWeightKg: 0.5, amount: null, linePrice: 1 },
        { productId: byAmount, purchaseMode: "amount", selectedWeightKg: 99, amount: 100, linePrice: 1 }
    ] });
    const checkout = await buildCheckout(userId, addressId);
    assert.equal(checkout.itemList[0].linePrice, 90);
    assert.equal(checkout.itemList[1].selectedWeightKg, 1);
    assert.equal(checkout.itemList[1].linePrice, 100);
    assert.equal(checkout.subTotalAmt, 190);
});

test("uses a loose product's selected 100 g price basis for weight and amount checkout", async () => {
    const basisProduct = product({
        sellingType: "loose",
        price: 23,
        priceUnitGrams: 100,
        pricePerKg: 230,
        discount: 17,
        looseConfig: { presetWeightsKg: [0.1], allowCustomWeight: false, allowAmount: true },
        stock: 1,
    });
    mockCheckoutData({ cart: [
        { productId: basisProduct, purchaseMode: "weight", selectedWeightKg: 0.1, amount: null },
        { productId: basisProduct, purchaseMode: "amount", selectedWeightKg: 99, amount: 38 },
    ] });
    const checkout = await buildCheckout(userId, addressId);
    assert.equal(checkout.itemList[0].linePrice, 19);
    assert.equal(checkout.itemList[1].selectedWeightKg, 0.2);
    assert.equal(checkout.itemList[1].linePrice, 38);
    assert.equal(checkout.subTotalAmt, 57);
});

test("uses the highest enabled category handling fee and applies the selected area's free-delivery threshold", async () => {
    const categoryIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    const itemProduct = product({ category: categoryIds });
    mockCheckoutData({ address: { _id: addressId, area: "Salempur" }, cart: [{ productId: itemProduct, quantity: 2 }] });
    checkoutCategories = [
        { handlingFeeEnabled: true, handlingFee: 5 },
        { handlingFeeEnabled: true, handlingFee: 12 },
        { handlingFeeEnabled: false, handlingFee: 99 }
    ];
    checkoutArea = { name: "Salempur", deliveryFee: 40, estimatedDeliveryMinutes: 20, freeDeliveryMinimumOrderValue: 180, isEnabled: true };
    const checkout = await buildCheckout(userId, addressId);
    assert.equal(checkout.subTotalAmt, 180);
    assert.equal(checkout.deliveryFee, 0);
    assert.equal(checkout.deliverySavings, 40);
    assert.equal(checkout.handlingCharge, 12);
    assert.equal(checkout.estimatedDeliveryMinutes, 20);
    assert.equal(checkout.totalAmt, 192);
});

test("delivery area fee and threshold remain server-calculated below the free-delivery minimum", async () => {
    mockCheckoutData({ address: { _id: addressId, area: "Deoria" }, cart: [{ productId: product({ discount: 0 }), quantity: 1 }] });
    checkoutArea = { name: "Deoria", deliveryFee: 30, estimatedDeliveryMinutes: 15, freeDeliveryMinimumOrderValue: 399, isEnabled: true };
    const checkout = await buildCheckout(userId, addressId);
    assert.equal(checkout.deliveryFee, 30);
    assert.equal(checkout.estimatedDeliveryMinutes, 15);
    assert.equal(checkout.freeDelivery, false);
    assert.equal(checkout.totalAmt, 130);
});

test("COD order stores the calculated delivery, handling, free-delivery, area, and time snapshot", async () => {
    const categoryId = new mongoose.Types.ObjectId();
    mockCheckoutData({ address: { _id: addressId, area: "Salempur" }, cart: [{ productId: product({ category: [categoryId], discount: 0 }), quantity: 1 }] });
    checkoutCategories = [{ handlingFeeEnabled: true, handlingFee: 7 }];
    checkoutArea = { name: "Salempur", deliveryFee: 40, estimatedDeliveryMinutes: 20, freeDeliveryMinimumOrderValue: 100, isEnabled: true };
    CartProductModel.deleteMany = async () => ({});
    let savedOrder;
    OrderModel.prototype.save = async function save() { savedOrder = this; return this; };
    const response = verificationResponse();
    await createCashOnDeliveryOrderController({ userId, body: { delivery_address_id: addressId } }, response);
    assert.equal(response.body.success, true);
    assert.equal(savedOrder.deliveryCharge, 0);
    assert.equal(savedOrder.deliverySavings, 40);
    assert.equal(savedOrder.freeDelivery, true);
    assert.equal(savedOrder.handlingCharge, 7);
    assert.equal(savedOrder.deliveryAreaName, "Salempur");
    assert.equal(savedOrder.freeDeliveryMinimumOrderValue, 100);
    assert.equal(savedOrder.delivery_time, 20);
});

test("rejects another user's address and insufficient stock", async () => {
    mockCheckoutData({ address: null, cart: [] });
    await assert.rejects(() => buildCheckout(userId, addressId), /Delivery address was not found/);

    const itemProduct = product({ stock: 1 });
    mockCheckoutData({ cart: [{ productId: itemProduct, quantity: 2 }] });
    await assert.rejects(() => buildCheckout(userId, addressId), /Insufficient stock/);
});

test("COD and Razorpay creation ignore tampered totals, prices, and coupon discounts", async () => {
    const itemProduct = product({ price: 250, discount: 20 });
    mockCheckoutData({ cart: [{ productId: itemProduct, quantity: 2, linePrice: 0 }] });
    CartProductModel.deleteMany = async () => ({});
    let savedOrder;
    OrderModel.prototype.save = async function save() { savedOrder = this; return this; };
    const response = { status() { return this; }, json(body) { this.body = body; return body; } };
    await createCashOnDeliveryOrderController({ userId, body: { delivery_address_id: addressId, totalAmt: 1, subTotalAmt: 0, otherCharge: 0, couponDiscount: 999, itemList: [] } }, response);
    assert.equal(response.body.success, true);
    assert.equal(savedOrder.subTotalAmt, 400);
    assert.equal(savedOrder.totalAmt, 430);

    UserModel.findById = async () => ({ email: "test@example.com" });
    let razorpayOptions;
    razorpayInstance.orders.create = async (options) => { razorpayOptions = options; return { id: "order_test", ...options }; };
    await razorpayPaymentOrderController({ userId, body: { delivery_address_id: addressId, totalAmt: 1, itemList: [] } }, response);
    assert.equal(response.body.success, true);
    assert.equal(razorpayOptions.amount, 43000);
});

test("COD rejects an invalid coupon code without creating an order", async () => {
    const itemProduct = product({ price: 100, discount: 0 });
    mockCheckoutData({ cart: [{ productId: itemProduct, quantity: 1 }] });
    CouponModel.findOne = async () => null;
    let saveCalled = false;
    OrderModel.prototype.save = async function save() { saveCalled = true; return this; };
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return body; } };

    await createCashOnDeliveryOrderController({ userId, body: { delivery_address_id: addressId, couponCode: "INVALID" } }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(saveCalled, false);
});

test("closed store rejects order creation server-side", async () => {
    StoreSettingsModel.findOne = () => ({ lean: async () => ({ manualIsOpen: false }) });
    let orderSaved = false;
    OrderModel.prototype.save = async function save() { orderSaved = true; return this; };
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return body; } };

    await createCashOnDeliveryOrderController({ userId, body: { delivery_address_id: addressId } }, response);

    StoreSettingsModel.findOne = () => ({ lean: async () => ({ manualIsOpen: true }) });
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, "STORE_CLOSED");
    assert.equal(orderSaved, false);
});

test("server checkout applies a valid fixed coupon and ignores a forged client discount", async () => {
    const itemProduct = product({ price: 250, discount: 20 });
    mockCheckoutData({ cart: [{ productId: itemProduct, quantity: 2 }] });
    const coupon = {
        _id: new mongoose.Types.ObjectId(),
        code: "SAVE50",
        discountType: "fixed",
        discountValue: 50,
        minimumOrderValue: 100,
        maximumDiscount: null,
        startsAt: new Date(Date.now() - 60_000),
        expiresAt: null,
        isActive: true,
        usageLimit: 10,
        perUserUsageLimit: 1,
        usageCount: 0,
        applicableUsers: [],
        isReferralRewardTemplate: false
    };
    CouponModel.findOne = async () => coupon;
    CouponModel.findOneAndUpdate = async () => coupon;
    CouponUserUsageModel.findOne = async () => null;
    CouponUserUsageModel.findOneAndUpdate = async () => ({ _id: "usage-1" });
    CouponUserUsageModel.create = async () => ({ _id: "usage-1" });
    CouponRedemptionModel.findOne = async () => null;
    CouponRedemptionModel.create = async (redemption) => redemption;

    let savedOrder;
    OrderModel.prototype.save = async function save() { savedOrder = this; return this; };
    CartProductModel.deleteMany = async () => ({});
    const response = verificationResponse();
    await createCashOnDeliveryOrderController({ userId, body: {
        delivery_address_id: addressId,
        couponCode: " save50 ",
        couponDiscount: 999,
        totalAmt: 1,
        subTotalAmt: 0,
        itemList: []
    } }, response);

    assert.equal(response.body.success, true);
    assert.equal(savedOrder.subTotalAmt, 400);
    assert.equal(savedOrder.couponCode, "SAVE50");
    assert.equal(savedOrder.couponDiscount, 50);
    assert.equal(savedOrder.totalAmt, 380);
});

const razorpayIds = { paymentId: "pay_test123", orderId: "order_test123", appOrderId: "ORD123456" };
const signedPaymentResponse = (overrides = {}) => {
    const body = `${razorpayIds.orderId}|${razorpayIds.paymentId}`;
    return {
        razorpay_payment_id: razorpayIds.paymentId,
        razorpay_order_id: razorpayIds.orderId,
        razorpay_signature: crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY).update(body).digest("hex"),
        ...overrides
    };
};

const mockRazorpayVerification = ({ notesUserId = userId.toString(), gatewayOrderOverrides = {}, paymentOverrides = {}, existingOrder = null } = {}) => {
    const itemProduct = product({ price: 100, discount: 0 });
    mockCheckoutData({ cart: [{ productId: itemProduct, quantity: 1 }] });
    CartProductModel.deleteMany = async () => ({});
    let savedOrder;
    OrderModel.prototype.save = async function save() { savedOrder = this; return this; };
    OrderModel.findOne = async () => existingOrder;
    razorpayInstance.orders.fetch = async () => ({
        id: razorpayIds.orderId,
        amount: 13000,
        currency: "INR",
        notes: {
            userId: notesUserId,
            delivery_address_id: addressId.toString(),
            orderId: razorpayIds.appOrderId,
            couponCode: "",
            couponId: "",
            couponDiscount: "0.00"
        },
        ...gatewayOrderOverrides
    });
    razorpayInstance.payments.fetch = async () => ({
        id: razorpayIds.paymentId,
        order_id: razorpayIds.orderId,
        amount: 13000,
        currency: "INR",
        status: "captured",
        ...paymentOverrides
    });
    return { getSavedOrder: () => savedOrder };
};

const verificationResponse = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; }
});

test("Razorpay verification saves a paid order for a valid captured payment", async () => {
    const verification = mockRazorpayVerification();
    const response = verificationResponse();
    await razorpayPaymentVerification({ userId, body: { paymentResponse: signedPaymentResponse(), orderData: { totalAmt: 1, paymentStatus: "Paid" } } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(verification.getSavedOrder().paymentStatus, "Paid");
    assert.equal(verification.getSavedOrder().totalAmt, 130);
    assert.equal(verification.getSavedOrder().paymentId, razorpayIds.paymentId);
});

test("Razorpay verification rejects an invalid signature", async () => {
    mockRazorpayVerification();
    const response = verificationResponse();
    await razorpayPaymentVerification({ userId, body: { paymentResponse: signedPaymentResponse({ razorpay_signature: "0".repeat(64) }) } }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
});

test("Razorpay verification rejects a payment attached to a different order ID", async () => {
    mockRazorpayVerification({ paymentOverrides: { order_id: "order_other123" } });
    const response = verificationResponse();
    await razorpayPaymentVerification({ userId, body: { paymentResponse: signedPaymentResponse() } }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
});

test("Razorpay verification rejects an amount different from the server checkout total", async () => {
    mockRazorpayVerification({ gatewayOrderOverrides: { amount: 12999 }, paymentOverrides: { amount: 12999 } });
    const response = verificationResponse();
    await razorpayPaymentVerification({ userId, body: { paymentResponse: signedPaymentResponse() } }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
});

test("Razorpay verification rejects another user's order and payment", async () => {
    const otherUserId = new mongoose.Types.ObjectId();
    mockRazorpayVerification({ notesUserId: otherUserId.toString() });
    const otherOrderResponse = verificationResponse();
    await razorpayPaymentVerification({ userId, body: { paymentResponse: signedPaymentResponse() } }, otherOrderResponse);
    assert.equal(otherOrderResponse.statusCode, 403);

    mockRazorpayVerification({ existingOrder: {
        userId: otherUserId,
        orderId: razorpayIds.appOrderId,
        payment_type: "Razorpay",
        paymentStatus: "Paid",
        totalAmt: 130
    } });
    const otherPaymentResponse = verificationResponse();
    await razorpayPaymentVerification({ userId, body: { paymentResponse: signedPaymentResponse() } }, otherPaymentResponse);
    assert.equal(otherPaymentResponse.statusCode, 409);
    assert.equal(otherPaymentResponse.body.success, false);
});
