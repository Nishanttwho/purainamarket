import assert from "node:assert/strict";
import test from "node:test";
import { discountedUnitPrice, getCartOriginalTotal, getCartSubtotal } from "../src/utils/cartPricing.js";

test("packed cart pricing uses the same discounted unit price as checkout", () => {
    assert.equal(discountedUnitPrice(160, 20), 128);
    assert.equal(getCartSubtotal([{ sellingType: "packed", quantity: 2, productId: { price: 160, discount: 20 } }]), 256);
    assert.equal(getCartOriginalTotal([{ sellingType: "packed", quantity: 2, productId: { price: 160, discount: 20 } }]), 320);
});

test("loose weight totals use discounted per-kg pricing and amount totals preserve their selected spend", () => {
    const weightItem = { sellingType: "loose", purchaseMode: "weight", selectedWeightKg: 0.5, linePrice: 100, productId: { pricePerKg: 200, discount: 20 } };
    const amountItem = { sellingType: "loose", purchaseMode: "amount", amount: 50, linePrice: 50, productId: { pricePerKg: 200, discount: 20 } };
    assert.equal(getCartSubtotal([weightItem]), 80);
    assert.equal(getCartOriginalTotal([weightItem]), 100);
    assert.equal(getCartSubtotal([amountItem]), 50);
});
