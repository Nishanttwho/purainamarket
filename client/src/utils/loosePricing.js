import { discountedUnitPrice } from "./priceMath.js";

export const getLoosePriceBasis = (product = {}) => {
    const unitGrams = Number(product.priceUnitGrams);
    const basisPrice = Number(product.price);
    if ([100, 250, 500, 1000].includes(unitGrams) && Number.isFinite(basisPrice) && basisPrice > 0) {
        return { unitGrams, basisPrice, legacy: false };
    }
    return { unitGrams: 1000, basisPrice: Number(product.pricePerKg ?? product.price) || 0, legacy: true };
};

export const getLoosePricePerKg = (product = {}) => {
    const { unitGrams, basisPrice } = getLoosePriceBasis(product);
    return basisPrice * 1000 / unitGrams;
};

export const getLooseDiscountedPricePerKg = (product = {}) => {
    const { unitGrams, basisPrice } = getLoosePriceBasis(product);
    return discountedUnitPrice(basisPrice, product.discount) * 1000 / unitGrams;
};

export const getLoosePriceUnitLabel = (product = {}) => {
    const { unitGrams } = getLoosePriceBasis(product);
    return unitGrams === 1000 ? "1 kg" : `${unitGrams} g`;
};

export const getLooseBaseUnitPrice = (product = {}) => getLoosePriceBasis(product).basisPrice;

export const getLooseDiscountedUnitPrice = (product = {}) => {
    const { basisPrice } = getLoosePriceBasis(product);
    return discountedUnitPrice(basisPrice, product.discount);
};
