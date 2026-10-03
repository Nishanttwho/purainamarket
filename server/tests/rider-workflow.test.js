import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import ReferralModel from "../models/referral.model.js";
import { acceptRiderOrderController, cancelRiderOrderController, deliverRiderOrderController } from "../controllers/rider.controller.js";
import { updateOrderStatusController } from "../controllers/order.controller.js";

const riderId = new mongoose.Types.ObjectId();
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const queryFor = (value) => ({ populate() { return this; }, sort() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });

test("rider can accept multiple orders and the model has no one-active-order unique index", async () => {
    const orders = [
        { _id: new mongoose.Types.ObjectId(), orderId: "ORD-1", order_status: "Pending", riderId: null },
        { _id: new mongoose.Types.ObjectId(), orderId: "ORD-2", order_status: "Shipped", riderId: null }
    ];
    OrderModel.findOneAndUpdate = async (filter, update) => {
        const order = orders.find((candidate) => candidate.orderId === (filter.orderId || "") && ["Pending", "Processing", "Shipped"].includes(candidate.order_status) && !candidate.riderId);
        if (!order) return null;
        Object.assign(order, update.$set);
        return order;
    };
    OrderModel.findById = (id) => queryFor(orders.find((order) => order._id.equals(id)));

    for (const order of orders) {
        const res = response();
        await acceptRiderOrderController({ userId: riderId, params: { orderId: order.orderId } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
    }

    assert.equal(orders.filter((order) => order.riderId?.equals(riderId) && order.order_status === "Out for Delivery").length, 2);
    assert.equal(OrderModel.schema.indexes().some(([keys, options]) => keys.riderId === 1 && options.unique), false);
});

test("rider cancellation and delivery update separate active orders independently", async () => {
    const cancelledOrder = { _id: new mongoose.Types.ObjectId(), orderId: "ORD-CANCEL", riderId, order_status: "Out for Delivery", payment_type: "Razorpay", paymentStatus: "Paid", paymentId: "pay_cancel", statusHistory: [] };
    const deliveredOrder = { _id: new mongoose.Types.ObjectId(), orderId: "ORD-DELIVER", riderId, order_status: "Out for Delivery", payment_type: "Razorpay", paymentStatus: "Paid", paymentId: "pay_deliver", userId: new mongoose.Types.ObjectId(), statusHistory: [] };
    const orders = [cancelledOrder, deliveredOrder];
    OrderModel.findOne = async (filter) => orders.find((order) => (filter._id ? order._id.equals(filter._id) : order.orderId === filter.orderId) && order.riderId.equals(filter.riderId) && order.order_status === filter.order_status) || null;
    OrderModel.findOneAndUpdate = async (filter, update) => {
        const order = orders.find((candidate) => {
            if (filter.orderId && candidate.orderId !== filter.orderId) return false;
            if (filter._id && !candidate._id.equals(filter._id)) return false;
            if (Array.isArray(filter.$or)) return filter.$or.some((condition) => {
                if (condition.riderId && condition.order_status === "Out for Delivery") return candidate.riderId.equals(condition.riderId) && candidate.order_status === condition.order_status;
                return condition.order_status?.$in?.includes(candidate.order_status) && !candidate.riderId;
            });
            return candidate.riderId.equals(filter.riderId) && candidate.order_status === filter.order_status;
        });
        if (!order) return null;
        Object.assign(order, update.$set);
        if (update.$push?.statusHistory) order.statusHistory.push(update.$push.statusHistory);
        return order;
    };
    ReferralModel.findOneAndUpdate = async () => null;

    const cancelResponse = response();
    await cancelRiderOrderController({ userId: riderId, params: { orderId: cancelledOrder.orderId }, body: { cancellationReason: "Customer unavailable" } }, cancelResponse);
    assert.equal(cancelResponse.statusCode, 200);
    assert.equal(cancelledOrder.order_status, "Cancelled");
    assert.equal(cancelledOrder.cancellationReason, "Customer unavailable");
    assert.equal(cancelledOrder.statusHistory.at(-1).reason, "Customer unavailable");

    const deliverResponse = response();
    await deliverRiderOrderController({ userId: riderId, params: { orderId: deliveredOrder.orderId } }, deliverResponse);
    assert.equal(deliverResponse.statusCode, 200);
    assert.equal(deliveredOrder.order_status, "Delivered");
    assert.equal(cancelledOrder.order_status, "Cancelled");
});

test("rider can cancel an unassigned available order without accepting it first", async () => {
    const order = { _id: new mongoose.Types.ObjectId(), orderId: "ORD-AVAILABLE", riderId: null, order_status: "Shipped", statusHistory: [] };
    OrderModel.findOneAndUpdate = async (filter, update) => {
        const availableBranch = filter.$or?.find((condition) => condition.order_status?.$in);
        if (filter.orderId !== order.orderId || !availableBranch || !availableBranch.order_status.$in.includes(order.order_status) || order.riderId) return null;
        Object.assign(order, update.$set);
        order.statusHistory.push(update.$push.statusHistory);
        return order;
    };
    const res = response();
    await cancelRiderOrderController({ userId: riderId, params: { orderId: order.orderId }, body: { cancellationReason: "Outside rider route" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(order.order_status, "Cancelled");
    assert.equal(order.riderId, null);
    assert.equal(order.cancellationReason, "Outside rider route");
    assert.equal(order.statusHistory.at(-1).status, "Cancelled");
    assert.equal(order.statusHistory.at(-1).reason, "Outside rider route");

    const repeat = response();
    await cancelRiderOrderController({ userId: riderId, params: { orderId: order.orderId }, body: { cancellationReason: "Again" } }, repeat);
    assert.equal(repeat.statusCode, 409);
});

test("admin can cancel an active rider order with a reason and cannot repeat an invalid transition", async () => {
    UserModel.findById = () => ({ lean: async () => ({ role: "ADMIN" }) });
    const order = { _id: new mongoose.Types.ObjectId(), order_status: "Out for Delivery", statusHistory: [], couponCode: "", async save() { return this; } };
    OrderModel.findById = async (id) => order._id.equals(id) ? order : null;
    const cancelResponse = response();
    await updateOrderStatusController({ userId: riderId, body: { orderId: order._id.toString(), order_status: "Cancelled", cancellationReason: "Route unavailable" } }, cancelResponse);
    assert.equal(cancelResponse.statusCode, 200);
    assert.equal(order.order_status, "Cancelled");
    assert.equal(order.cancellationReason, "Route unavailable");
    assert.equal(order.statusHistory.at(-1).reason, "Route unavailable");

    const repeatResponse = response();
    await updateOrderStatusController({ userId: riderId, body: { orderId: order._id.toString(), order_status: "Cancelled", cancellationReason: "Again" } }, repeatResponse);
    assert.equal(repeatResponse.statusCode, 409);
});
