import DeliveryAreaModel from "../models/deliveryArea.model.js";

const cleanArea = (body = {}) => ({
    name: String(body.name || "").trim(),
    deliveryFee: Number(body.deliveryFee),
    estimatedDeliveryMinutes: Number(body.estimatedDeliveryMinutes),
    freeDeliveryMinimumOrderValue: body.freeDeliveryMinimumOrderValue === "" || body.freeDeliveryMinimumOrderValue === null ? null : Number(body.freeDeliveryMinimumOrderValue),
    isEnabled: body.isEnabled !== false
});
const validate = (area) => {
    if (!area.name || !Number.isFinite(area.deliveryFee) || area.deliveryFee < 0 || !Number.isFinite(area.estimatedDeliveryMinutes) || area.estimatedDeliveryMinutes < 0 || (area.freeDeliveryMinimumOrderValue !== null && (!Number.isFinite(area.freeDeliveryMinimumOrderValue) || area.freeDeliveryMinimumOrderValue < 0))) {
        throw Object.assign(new Error("Provide a name and valid delivery fee, time, and free-delivery minimum."), { status: 400 });
    }
};
export const listDeliveryAreas = async (_req, res) => {
    try { return res.json({ success: true, error: false, data: await DeliveryAreaModel.find().sort({ name: 1 }).lean() }); }
    catch (error) { return res.status(500).json({ success: false, error: true, message: error.message }); }
};
export const listActiveDeliveryAreas = async (_req, res) => {
    try { return res.json({ success: true, error: false, data: await DeliveryAreaModel.find({ isEnabled: true }).sort({ name: 1 }).select("name").lean() }); }
    catch (error) { return res.status(500).json({ success: false, error: true, message: error.message }); }
};
export const saveDeliveryArea = async (req, res) => {
    try { const area = cleanArea(req.body); validate(area); const data = await DeliveryAreaModel.findByIdAndUpdate(req.params.id, area, { new: true, runValidators: true }); if (!data) return res.status(404).json({ success: false, error: true, message: "Delivery area not found." }); return res.json({ success: true, error: false, data }); }
    catch (error) { return res.status(error.status || (error.code === 11000 ? 409 : 500)).json({ success: false, error: true, message: error.code === 11000 ? "A delivery area with that name already exists." : error.message }); }
};
export const createDeliveryArea = async (req, res) => {
    try { const area = cleanArea(req.body); validate(area); return res.status(201).json({ success: true, error: false, data: await DeliveryAreaModel.create(area) }); }
    catch (error) { return res.status(error.status || (error.code === 11000 ? 409 : 500)).json({ success: false, error: true, message: error.code === 11000 ? "A delivery area with that name already exists." : error.message }); }
};
