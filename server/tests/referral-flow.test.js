import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import CouponModel from "../models/coupon.model.js";
import OrderModel from "../models/order.model.js";
import ReferralModel from "../models/referral.model.js";
import UserModel from "../models/user.model.js";
import { createRegisterUserController } from "../controllers/user.controller.js";
import { deliverRiderOrderController } from "../controllers/rider.controller.js";
import { ReferralAttributionError, recordReferralAttribution } from "../utils/referralAttribution.js";
import { getPendingReferralCode, persistReferralCodeFromSearch } from "../../client/src/utils/referralAttribution.js";

process.env.SECRET_KEY_ACCESS_TOKEN = "referral-test-access-secret";
process.env.SECRET_KEY_REFRESH_TOKEN = "referral-test-refresh-secret";

const makeStorage = () => {
    const values = new Map();
    return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};
const response = () => ({ statusCode: 200, cookies: [], status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, cookie(name, value) { this.cookies.push({ name, value }); return this; } });

test("referral link code survives route changes and signup stores pending attribution", async () => {
    const storage = makeStorage();
    const inviterId = new mongoose.Types.ObjectId();
    const code = "PM1234567890ABCDEF12345678";
    assert.equal(persistReferralCodeFromSearch(`?ref=${code}`, { storage }), code);
    assert.equal(persistReferralCodeFromSearch("", { storage }), code);
    assert.equal(getPendingReferralCode(storage), code);
    const otherStorage = makeStorage();
    assert.equal(persistReferralCodeFromSearch(`?ref=${code}`, { storage: otherStorage, hasExistingSession: true }), "");

    const savedRelationships = [];
    const inviter = { _id: inviterId };
    UserModel.findOne = (query) => query.referralCode
        ? { select: async () => inviter }
        : Promise.resolve(null);
    UserModel.prototype.save = async function save() { return this; };
    UserModel.updateOne = async () => ({});
    ReferralModel.create = async (relationship) => {
        const created = { ...relationship, status: "Pending", rewardCouponId: null };
        savedRelationships.push(created);
        return created;
    };
    let rewardCouponCreated = false;
    CouponModel.create = async () => { rewardCouponCreated = true; };
    assert.equal(savedRelationships.length, 0, "opening the link alone must not create a referral record");

    const register = createRegisterUserController(async () => null);
    const res = response();
    await register({ body: { name: "New Customer", email: "new@example.test", mobile: "5551234567", password: "Passw0rd!", referralCode: getPendingReferralCode(storage) } }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(savedRelationships.length, 1);
    assert.equal(savedRelationships[0].referralCode, code);
    assert.equal(savedRelationships[0].inviterId.toString(), inviterId.toString());
    assert.equal(savedRelationships[0].referredUserId.toString(), res.body.data.user._id.toString());
    assert.equal(savedRelationships[0].status, "Pending");
    assert.equal(rewardCouponCreated, false);
});

test("invalid, self, and duplicate referral attribution are rejected or idempotent", async () => {
    UserModel.findOne = (query) => query.referralCode ? { select: async () => null } : Promise.resolve(null);
    let userSaved = false;
    UserModel.prototype.save = async function save() { userSaved = true; return this; };
    const register = createRegisterUserController(async () => null);
    const invalidResponse = response();
    await register({ body: { name: "New Customer", email: "invalid@example.test", mobile: "5557654321", password: "Passw0rd!", referralCode: "NO-SUCH-CODE" } }, invalidResponse);
    assert.equal(invalidResponse.statusCode, 400);
    assert.equal(userSaved, false);

    const sameId = new mongoose.Types.ObjectId();
    await assert.rejects(() => recordReferralAttribution({ inviter: { _id: sameId }, referredUserId: sameId, referralCode: "PMSELF" }), ReferralAttributionError);

    const inviterId = new mongoose.Types.ObjectId();
    const otherInviterId = new mongoose.Types.ObjectId();
    const referredUserId = new mongoose.Types.ObjectId();
    const existing = { inviterId: otherInviterId, referredUserId };
    ReferralModel.create = async () => { throw Object.assign(new Error("duplicate"), { code: 11000 }); };
    ReferralModel.findOne = () => ({ lean: async () => existing });
    await assert.rejects(() => recordReferralAttribution({ inviter: { _id: inviterId }, referredUserId, referralCode: "PMOTHER" }), (error) => error.status === 409);
    existing.inviterId = inviterId;
    assert.equal(await recordReferralAttribution({ inviter: { _id: inviterId }, referredUserId, referralCode: "PMOTHER" }), existing);
});

test("a referral stays pending at signup and earns its reward only after a qualifying order is delivered", async () => {
    const referredUserId = new mongoose.Types.ObjectId();
    const riderId = new mongoose.Types.ObjectId();
    const referral = { _id: new mongoose.Types.ObjectId(), inviterId: new mongoose.Types.ObjectId(), referredUserId, status: "Pending", rewardCouponId: null };
    let order = { _id: new mongoose.Types.ObjectId(), orderId: "ORD-REF-FIRST", riderId, userId: referredUserId, order_status: "Out for Delivery", payment_type: "Razorpay", paymentStatus: "Paid", paymentId: "pay-ref-first", subTotalAmt: 50, couponCode: "" };
    let rewardCreates = 0;
    const template = { _id: new mongoose.Types.ObjectId(), isReferralRewardTemplate: true, isActive: true, referralMinimumOrderValue: 100, discountType: "fixed", discountValue: 25, minimumOrderValue: 0, maximumDiscount: null, rewardValidityDays: 30 };
    assert.equal(referral.status, "Pending");
    assert.equal(rewardCreates, 0);

    OrderModel.findOne = async (filter) => order.orderId === filter.orderId && order.order_status === filter.order_status ? order : null;
    OrderModel.findOneAndUpdate = async (_filter, update) => { Object.assign(order, update.$set); return order; };
    ReferralModel.findOneAndUpdate = async (filter, update) => {
        if (referral.referredUserId.toString() !== filter.referredUserId.toString() || referral.status !== filter.status) return null;
        Object.assign(referral, update.$set);
        return referral;
    };
    ReferralModel.updateOne = async (_filter, update) => { Object.assign(referral, update.$set); return {}; };
    CouponModel.findOne = async () => template;
    CouponModel.create = async (reward) => { rewardCreates += 1; return { _id: new mongoose.Types.ObjectId(), ...reward }; };

    const firstDelivery = response();
    await deliverRiderOrderController({ userId: riderId, params: { orderId: order.orderId } }, firstDelivery);
    assert.equal(firstDelivery.statusCode, 200);
    assert.equal(order.order_status, "Delivered");
    assert.equal(referral.status, "Pending");
    assert.equal(rewardCreates, 0);

    order = { _id: new mongoose.Types.ObjectId(), orderId: "ORD-REF-QUALIFIED", riderId, userId: referredUserId, order_status: "Out for Delivery", payment_type: "Razorpay", paymentStatus: "Paid", paymentId: "pay-ref-qualified", subTotalAmt: 150, couponCode: "" };
    const res = response();
    await deliverRiderOrderController({ userId: riderId, params: { orderId: order.orderId } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(order.order_status, "Delivered");
    assert.equal(referral.status, "Rewarded");
    assert.equal(referral.qualifyingOrderId.toString(), order._id.toString());
    assert.equal(rewardCreates, 1);

    const retry = response();
    await deliverRiderOrderController({ userId: riderId, params: { orderId: order.orderId } }, retry);
    assert.equal(retry.statusCode, 404);
    assert.equal(rewardCreates, 1);
});
