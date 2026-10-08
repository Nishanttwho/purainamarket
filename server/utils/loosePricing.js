import { pricewithDiscount } from "./PriceWithDiscount.js";

export const LOOSE_PRICE_UNITS_GRAMS = [100, 250, 500, 1000];
export const DEFAULT_PRESET_WEIGHTS_GRAMS = [250, 500, 1000, 2000, 5000];

export const getPresetWeightsGrams = (productOrConfig = {}) => {
    const config = productOrConfig.looseConfig || productOrConfig;
    if (Array.isArray(config.presetWeightsGrams)) {
        return config.presetWeightsGrams.map(Number).filter(value => Number.isFinite(value) && value > 0);
    }
    if (Array.isArray(config.presetWeightsKg)) {
        return config.presetWeightsKg.map(value => Number(value) * 1000).filter(value => Number.isFinite(value) && value > 0);
    }
    return DEFAULT_PRESET_WEIGHTS_GRAMS;
};

export const normalizeLooseConfig = (config = {}) => {
    const normalized = { ...config, presetWeightsGrams: getPresetWeightsGrams(config) };
    delete normalized.presetWeightsKg;
    return normalized;
};

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
