const money = (value) => Number(Number(value || 0).toFixed(2));

// Keep the storefront's cart math aligned with the server's PriceWithDiscount helper.
export const discountedUnitPrice = (price, discount = 0) => {
    const originalPrice = Number(price) || 0;
    const discountPercent = Number(discount) || 0;
    return money(originalPrice - Math.ceil((originalPrice * discountPercent) / 100));
};

export const getCartItemTotal = (item) => {
    if (item?.sellingType === "loose") {
        if (item.purchaseMode === "amount") return money(item.amount ?? item.linePrice);
        if (item.selectedWeightKg != null) {
            const rate = discountedUnitPrice(item.productId?.pricePerKg ?? item.productId?.price, item.productId?.discount);
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
        if (item.selectedWeightKg != null) return total + money(Number(item.selectedWeightKg) * (Number(item.productId?.pricePerKg ?? item.productId?.price) || 0));
        return total + money(item.linePrice);
    }
    return total + (Number(item?.productId?.price) || 0) * (Number(item?.quantity) || 0);
}, 0));
