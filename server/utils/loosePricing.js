import { pricewithDiscount } from "./PriceWithDiscount.js";

export const LOOSE_PRICE_UNITS_GRAMS = [100, 250, 500, 1000];

export const getLoosePriceBasis = (product = {}) => {
    const unitGrams = Number(product.priceUnitGrams);
    const basisPrice = Number(product.price);
    if (LOOSE_PRICE_UNITS_GRAMS.includes(unitGrams) && Number.isFinite(basisPrice) && basisPrice > 0) {
        return { unitGrams, basisPrice, legacy: false };
    }
    const legacyPerKg = Number(product.pricePerKg ?? product.price);
    return { unitGrams: 1000, basisPrice: legacyPerKg, legacy: true };
};

export const getLoosePricePerKg = (product = {}) => {
    const { unitGrams, basisPrice } = getLoosePriceBasis(product);
    return basisPrice * 1000 / unitGrams;
};

export const getLooseDiscountedPricePerKg = (product = {}) => {
    const { unitGrams, basisPrice } = getLoosePriceBasis(product);
    return pricewithDiscount(basisPrice, Number(product.discount) || 0) * 1000 / unitGrams;
};
