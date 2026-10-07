import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
    addToCartItemController,
    deleteItemFromCartController,
    getCartItemsController,
    updateCartItemQuantityController
} from "../controllers/cart.controller.js";
import CartProductModel from "../models/cartProduct.model.js";
import ProductModel from "../models/product.model.js";
import UserModel from "../models/user.model.js";

const responseMock = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; }
});

test("quantity update rejects an optimistic temporary ID before querying MongoDB", async () => {
    let queryCalled = false;
    CartProductModel.findOne = () => { queryCalled = true; throw new Error("must not query"); };
    const response = responseMock();

    await updateCartItemQuantityController({ userId: new mongoose.Types.ObjectId(), body: { _id: "optimistic-123-1", quantity: 2 } }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(queryCalled, false);
});

test("delete rejects an optimistic temporary ID before querying MongoDB", async () => {
    let deleteCalled = false;
    CartProductModel.deleteOne = () => { deleteCalled = true; throw new Error("must not query"); };
    const response = responseMock();

    await deleteItemFromCartController({ userId: new mongoose.Types.ObjectId(), body: { _id: "optimistic-123-1" } }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(deleteCalled, false);
});

test("quantity update still accepts a real cart ObjectId and validates stock", async () => {
    const cartItemId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    let updated;
    CartProductModel.findOne = () => ({ populate: async () => ({ sellingType: "packed", productId: { stock: 4 } }) });
    CartProductModel.updateOne = async (...args) => { updated = args; return { modifiedCount: 1 }; };
    const response = responseMock();

    await updateCartItemQuantityController({ userId, body: { _id: cartItemId.toString(), quantity: 3 } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(updated[0], { _id: cartItemId.toString(), userId });
    assert.deepEqual(updated[1], { quantity: 3 });
});

test("packed cart API stores no raw-price linePrice snapshot", async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const originalFindById = ProductModel.findById;
    const originalFindOne = CartProductModel.findOne;
    const originalSave = CartProductModel.prototype.save;
    const originalUserUpdate = UserModel.updateOne;
    ProductModel.findById = async () => ({ _id: productId, price: 160, discount: 20, sellingType: "packed" });
    CartProductModel.findOne = async () => null;
    CartProductModel.prototype.save = async function save() { return this; };
    UserModel.updateOne = async () => ({ acknowledged: true });
    const response = responseMock();

    try {
        await addToCartItemController({ userId, body: { productId: String(productId) } }, response);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.data.linePrice, null);
    } finally {
        ProductModel.findById = originalFindById;
        CartProductModel.findOne = originalFindOne;
        CartProductModel.prototype.save = originalSave;
        UserModel.updateOne = originalUserUpdate;
    }
});

test("loose weight cart linePrice stores the discounted selected weight amount", async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const originalFindById = ProductModel.findById;
    const originalFindOne = CartProductModel.findOne;
    const originalSave = CartProductModel.prototype.save;
    const originalUserUpdate = UserModel.updateOne;
    ProductModel.findById = async () => ({
        _id: productId,
        pricePerKg: 200,
        discount: 20,
        sellingType: "loose",
        looseConfig: { presetWeightsKg: [0.5], allowCustomWeight: false }
    });
    CartProductModel.findOne = async () => null;
    CartProductModel.prototype.save = async function save() { return this; };
    UserModel.updateOne = async () => ({ acknowledged: true });
    const response = responseMock();

    try {
        await addToCartItemController({ userId, body: { productId: String(productId), purchaseMode: "weight", selectedWeightKg: 0.5 } }, response);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.data.linePrice, 80);
    } finally {
        ProductModel.findById = originalFindById;
        CartProductModel.findOne = originalFindOne;
        CartProductModel.prototype.save = originalSave;
        UserModel.updateOne = originalUserUpdate;
    }
});

test("loose cart converts selected-unit pricing and amount purchases using the discounted rate", async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const originalFindById = ProductModel.findById;
    const originalFindOne = CartProductModel.findOne;
    const originalSave = CartProductModel.prototype.save;
    const originalUserUpdate = UserModel.updateOne;
    ProductModel.findById = async () => ({
        _id: productId,
        price: 23,
        priceUnitGrams: 100,
        pricePerKg: 230,
        discount: 17,
        sellingType: "loose",
        stock: 1,
        looseConfig: { presetWeightsKg: [0.1], allowCustomWeight: false, allowAmount: true }
    });
    CartProductModel.findOne = async () => null;
    CartProductModel.prototype.save = async function save() { return this; };
    UserModel.updateOne = async () => ({ acknowledged: true });
    const response = responseMock();

    try {
        await addToCartItemController({ userId, body: { productId: String(productId), purchaseMode: "weight", selectedWeightKg: 0.1 } }, response);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.data.linePrice, 19);

        const amountResponse = responseMock();
        await addToCartItemController({ userId, body: { productId: String(productId), purchaseMode: "amount", amount: 38 } }, amountResponse);
        assert.equal(amountResponse.statusCode, 200);
        assert.equal(amountResponse.body.data.selectedWeightKg, 0.2);
        assert.equal(amountResponse.body.data.linePrice, 38);
    } finally {
        ProductModel.findById = originalFindById;
        CartProductModel.findOne = originalFindOne;
        CartProductModel.prototype.save = originalSave;
        UserModel.updateOne = originalUserUpdate;
    }
});

test("cart fetch normalizes old packed snapshots and loose line prices to the current sale price", async () => {
    const originalFind = CartProductModel.find;
    const packed = { toObject: () => ({ sellingType: "packed", linePrice: 160, productId: { price: 160, discount: 20 } }) };
    const loose = { toObject: () => ({ sellingType: "loose", purchaseMode: "weight", selectedWeightKg: 0.5, linePrice: 100, productId: { pricePerKg: 200, discount: 20 } }) };
    CartProductModel.find = () => ({ populate: async () => [packed, loose] });
    const response = responseMock();

    try {
        await getCartItemsController({ userId: new mongoose.Types.ObjectId() }, response);
        assert.equal(response.body.data[0].linePrice, null);
        assert.equal(response.body.data[1].linePrice, 80);
    } finally {
        CartProductModel.find = originalFind;
    }
});
