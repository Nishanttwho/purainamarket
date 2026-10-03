import StoreSettingsModel from "../models/storeSettings.model.js";
import { getStoreAvailability } from "../utils/storeAvailability.js";

const parseDate = (value, label) => {
    if (value === null || value === undefined || value === "") return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw Object.assign(new Error(`${label} is not a valid date/time.`), { status: 400 });
    return date;
};

const settingsPayload = (body = {}) => {
    const schedulePeriods = Array.isArray(body.schedulePeriods) ? body.schedulePeriods.map((period, index) => {
        const startsAt = parseDate(period.startsAt, `Schedule ${index + 1} start`);
        const endsAt = parseDate(period.endsAt, `Schedule ${index + 1} end`);
        if (!startsAt || !endsAt || startsAt >= endsAt) throw Object.assign(new Error(`Schedule ${index + 1} needs an end time after its start time.`), { status: 400 });
        return {
            label: String(period.label || "").trim().slice(0, 80),
            startsAt,
            endsAt,
            isOpen: period.isOpen === true,
            message: String(period.message || "").trim().slice(0, 240)
        };
    }) : [];
    const orderingStartsAt = parseDate(body.orderingStartsAt, "Ordering start");
    const orderingEndsAt = parseDate(body.orderingEndsAt, "Ordering end");
    if (orderingStartsAt && orderingEndsAt && orderingStartsAt >= orderingEndsAt) {
        throw Object.assign(new Error("Ordering end must be later than ordering start."), { status: 400 });
    }
    return {
        manualIsOpen: body.manualIsOpen !== false,
        closedTodayUntil: parseDate(body.closedTodayUntil, "Closed-today end"),
        orderingStartsAt,
        orderingEndsAt,
        customMessage: String(body.customMessage || "").trim().slice(0, 240),
        schedulePeriods
    };
};

export const getPublicStoreStatusController = async (_req, res) => {
    try {
        const availability = await getStoreAvailability();
        const { settings, ...publicStatus } = availability;
        return res.status(200).json({ success: true, error: false, data: { ...publicStatus, settings: {
            manualIsOpen: settings.manualIsOpen !== false,
            closedTodayUntil: settings.closedTodayUntil || null,
            orderingStartsAt: settings.orderingStartsAt || null,
            orderingEndsAt: settings.orderingEndsAt || null,
            schedulePeriods: settings.schedulePeriods || []
        } } });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to check store status." });
    }
};

export const getAdminStoreSettingsController = async (_req, res) => {
    try {
        const settings = await StoreSettingsModel.findOne({ key: "store" }).lean() || { manualIsOpen: true, schedulePeriods: [] };
        return res.status(200).json({ success: true, error: false, data: settings });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to load store settings." });
    }
};

export const updateAdminStoreSettingsController = async (req, res) => {
    try {
        const settings = await StoreSettingsModel.findOneAndUpdate(
            { key: "store" },
            { $set: { ...settingsPayload(req.body), key: "store" } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        ).lean();
        return res.status(200).json({ success: true, error: false, message: "Store settings saved.", data: settings });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, error: true, message: error.message || "Unable to save store settings." });
    }
};
