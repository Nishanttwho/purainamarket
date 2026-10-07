export const money = (value) => Number(Number(value || 0).toFixed(2));

export const discountedUnitPrice = (price, discount = 0) => {
    const originalPrice = Number(price) || 0;
    const discountPercent = Number(discount) || 0;
    return money(originalPrice - Math.ceil((originalPrice * discountPercent) / 100));
};
