import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { addProductController, updateProductController } from "../controllers/product.controller.js";
import ProductModel from "../models/product.model.js";

const responseMock = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; }
});

test("creates a loose product with a validated 100 g pricing basis and gram presets", async () => {
    const originalSave = ProductModel.prototype.save;
    ProductModel.prototype.save = async function save() {
        const validationError = this.validateSync();
        if (validationError) throw validationError;
        return this;
    };
    const response = responseMock();

    try {
        await addProductController({ body: {
            name: "Loose lentils",
            image: ["image-url"],
            category: [new mongoose.Types.ObjectId()],
            subCategory: [new mongoose.Types.ObjectId()],
            unit: "100 g",
            stock: 5,
            price: 23,
            sellingType: "loose",
            priceUnitGrams: 100,
            looseConfig: { presetWeightsGrams: [250, 500, 1000] },
            description: "Test",
            discount: 17,
            more_details: {},
            publish: true
        } }, response);

        assert.equal(response.statusCode, 201);
        assert.equal(response.body.data.priceUnitGrams, 100);
        assert.equal(response.body.data.price, 23);
        assert.equal(response.body.data.pricePerKg, 230);
        assert.deepEqual(response.body.data.looseConfig.presetWeightsGrams, [250, 500, 1000]);
        assert.equal(response.body.data.looseConfig.presetWeightsKg, null);
    } finally {
        ProductModel.prototype.save = originalSave;
    }
});

test("updates legacy per-kg loose products into the 1 kg basis and gram presets", async () => {
    const originalUpdate = ProductModel.findByIdAndUpdate;
    let updateData;
    ProductModel.findByIdAndUpdate = async (_id, data) => { updateData = data; return data; };
    const response = responseMock();

    try {
        await updateProductController({
            params: { id: new mongoose.Types.ObjectId().toString() },
            body: {
                sellingType: "loose",
                price: 240,
                pricePerKg: 240,
                priceUnitGrams: null,
                looseConfig: { presetWeightsKg: [0.25, 0.5, 1] }
            }
        }, response);

        assert.equal(response.statusCode, 200);
        assert.equal(updateData.price, 240);
        assert.equal(updateData.priceUnitGrams, 1000);
        assert.equal(updateData.pricePerKg, 240);
        assert.deepEqual(updateData.looseConfig.presetWeightsGrams, [250, 500, 1000]);
        assert.equal(updateData.looseConfig.presetWeightsKg, undefined);
    } finally {
        ProductModel.findByIdAndUpdate = originalUpdate;
    }
});
