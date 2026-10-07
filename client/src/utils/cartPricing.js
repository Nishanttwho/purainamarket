import { discountedUnitPrice, money } from "./priceMath.js";
import { getLooseDiscountedPricePerKg, getLoosePricePerKg } from "./loosePricing.js";

export { discountedUnitPrice };

export const getCartItemTotal = (item) => {
    if (item?.sellingType === "loose") {
        if (item.purchaseMode === "amount") return money(item.amount ?? item.linePrice);
        if (item.selectedWeightKg != null) {
            const rate = getLooseDiscountedPricePerKg(item.productId || {});
            return money(Number(item.selectedWeightKg) * rate);
        }
        return money(item.linePrice);
    }

    const unitPrice = discountedUnitPrice(item?.productId?.price, item?.productId?.discount);
    return money(unitPrice * (Number(item?.quantity) || 0));
};

export const getCartSubtotal = (items = []) => money(items.reduce((total, item) => total + getCartItemTotal(item), 0));

export const getCartOriginalTotal = (items = []) => money(items.reduce((total, item) => {
    if (item?.sellingType === "loose") {
        if (item.purchaseMode === "amount") return total + money(item.amount ?? item.linePrice);
        if (item.selectedWeightKg != null) return total + money(Number(item.selectedWeightKg) * getLoosePricePerKg(item.productId || {}));
        return total + money(item.linePrice);
    }
    return total + (Number(item?.productId?.price) || 0) * (Number(item?.quantity) || 0);
}, 0));
