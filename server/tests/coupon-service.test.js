import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import CouponModel from "../models/coupon.model.js";
import CouponRedemptionModel from "../models/couponRedemption.model.js";
import CouponUserUsageModel from "../models/couponUserUsage.model.js";
import {
    calculateCouponDiscount,
    getCouponForCheckout,
    reserveCouponForOrder
} from "../utils/couponService.js";

const userId = new mongoose.Types.ObjectId();
const couponId = new mongoose.Types.ObjectId();

const validCoupon = (overrides = {}) => ({
    _id: couponId,
    code: "SAVE20",
    discountType: "percentage",
    discountValue: 20,
    minimumOrderValue: 100,
    maximumDiscount: 40,
    startsAt: new Date(Date.now() - 60_000),
    expiresAt: new Date(Date.now() + 60_000),
    isActive: true,
    usageLimit: 10,
    perUserUsageLimit: 2,
    usageCount: 0,
    isReferralRewardTemplate: false,
    applicableUsers: [],
    ...overrides
});

const configureValidation = ({ coupon = validCoupon(), userUsage = null, redemption = null } = {}) => {
    CouponModel.findOne = async () => coupon;
    CouponUserUsageModel.findOne = async () => userUsage;
    CouponRedemptionModel.findOne = async () => redemption;
};

test("calculates percentage and fixed coupon discounts with caps", () => {
    assert.equal(calculateCouponDiscount(validCoupon(), 300), 40);
    assert.equal(calculateCouponDiscount({ discountType: "fixed", discountValue: 75, maximumDiscount: null }, 50), 50);
});

test("accepts a valid coupon and normalizes its code", async () => {
    configureValidation();
    const result = await getCouponForCheckout(" save20 ", userId, 200);
    assert.equal(result.coupon.code, "SAVE20");
    assert.equal(result.discountAmount, 40);
});

test("rejects unknown, inactive, and expired coupons", async () => {
    CouponModel.findOne = async () => null;
    await assert.rejects(() => getCouponForCheckout("MISSING", userId, 200), /not valid/);

    configureValidation({ coupon: validCoupon({ isActive: false }) });
    await assert.rejects(() => getCouponForCheckout("SAVE20", userId, 200), /inactive/);

    configureValidation({ coupon: validCoupon({ expiresAt: new Date(Date.now() - 1) }) });
    await assert.rejects(() => getCouponForCheckout("SAVE20", userId, 200), /expired/);
});

test("enforces minimum order value and global usage limits", async () => {
    configureValidation();
    await assert.rejects(() => getCouponForCheckout("SAVE20", userId, 99), /more to use/);

    configureValidation({ coupon: validCoupon({ usageCount: 10, usageLimit: 10 }) });
    await assert.rejects(() => getCouponForCheckout("SAVE20", userId, 200), /usage limit/);
});

test("enforces per-user limits, targeted-user eligibility, and hides reward templates", async () => {
    configureValidation({ userUsage: { usageCount: 2 } });
    await assert.rejects(() => getCouponForCheckout("SAVE20", userId, 200), /maximum number/);

    configureValidation({ coupon: validCoupon({ applicableUsers: [new mongoose.Types.ObjectId()] }) });
    await assert.rejects(() => getCouponForCheckout("SAVE20", userId, 200), /not available/);

    configureValidation({ coupon: validCoupon({ isReferralRewardTemplate: true }) });
    await assert.rejects(() => getCouponForCheckout("SAVE20", userId, 200), /referral rewards/);
});

test("reserves coupon usage atomically and returns an existing order reservation", async () => {
    let globalIncrements = 0;
    let userIncrements = 0;
    CouponModel.findOneAndUpdate = async () => { globalIncrements += 1; return validCoupon(); };
    CouponUserUsageModel.findOneAndUpdate = async () => { userIncrements += 1; return { _id: "counter-1" }; };
    CouponRedemptionModel.findOne = async () => null;
    CouponRedemptionModel.create = async (redemption) => redemption;

    const first = await reserveCouponForOrder({ coupon: validCoupon(), userId, orderId: "ORD-1", discountAmount: 40 });
    assert.equal(first.status, "Reserved");
    assert.equal(globalIncrements, 1);
    assert.equal(userIncrements, 1);

    const existing = { couponId, userId, orderId: "ORD-1", status: "Reserved" };
    CouponRedemptionModel.findOne = async () => existing;
    const replay = await reserveCouponForOrder({ coupon: validCoupon(), userId, orderId: "ORD-1", discountAmount: 40 });
    assert.equal(replay, existing);
    assert.equal(globalIncrements, 1);
});

test("rejects a reservation when the atomic global usage limit is exhausted", async () => {
    CouponModel.findOneAndUpdate = async () => null;
    CouponRedemptionModel.findOne = async () => null;
    await assert.rejects(
        () => reserveCouponForOrder({ coupon: validCoupon({ usageCount: 10 }), userId, orderId: "ORD-2", discountAmount: 40 }),
        /usage limit/
    );
});