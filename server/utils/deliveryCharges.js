import DeliveryAreaModel from "../models/deliveryArea.model.js";
import CategoryModel from "../models/category.model.js";

const money = (value) => Number(Number(value || 0).toFixed(2));

export const getDeliveryAreaForAddress = async (address) => {
    const areaName = String(address?.area || "").trim();
    if (!areaName) return null;
    return DeliveryAreaModel.findOne({ name: { $regex: `^${areaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }).lean();
};

export const calculateCheckoutCharges = async ({ address, itemList, subTotalAmt }) => {
    const [deliveryArea, categories] = await Promise.all([
        getDeliveryAreaForAddress(address),
        CategoryModel.find({ _id: { $in: [...new Set(itemList.flatMap((item) => item.product.category || []).map(String))] } })
            .select("handlingFee handlingFeeEnabled").lean()
    ]);
    if (deliveryArea && !deliveryArea.isEnabled) {
        const error = new Error(`${deliveryArea.name} is currently unavailable for delivery.`);
        error.status = 400;
        throw error;
    }
    const handlingCharge = money(Math.max(0, ...categories
        .filter((category) => category.handlingFeeEnabled)
        .map((category) => Number(category.handlingFee) || 0)));
    const freeMinimum = deliveryArea?.freeDeliveryMinimumOrderValue;
    const freeDelivery = deliveryArea && freeMinimum !== null && freeMinimum !== undefined && Number(subTotalAmt) >= Number(freeMinimum);
    const standardDeliveryCharge = money(deliveryArea?.deliveryFee ?? (Number(subTotalAmt) < 500 ? 30 : 0));
    const deliveryCharge = freeDelivery ? 0 : standardDeliveryCharge;
    return {
        deliveryArea,
        deliveryCharge,
        deliverySavings: money(standardDeliveryCharge - deliveryCharge),
        handlingCharge,
        estimatedDeliveryMinutes: Number(deliveryArea?.estimatedDeliveryMinutes) || null,
        freeDelivery,
        freeDeliveryMinimumOrderValue: deliveryArea?.freeDeliveryMinimumOrderValue ?? null
    };
};
