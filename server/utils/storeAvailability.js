import StoreSettingsModel from "../models/storeSettings.model.js";

export const getStoreAvailability = async (now = new Date()) => {
    const settings = await StoreSettingsModel.findOne({ key: "store" }).lean() || {};
    const periods = [...(settings.schedulePeriods || [])]
        .filter((period) => new Date(period.startsAt) <= now && new Date(period.endsAt) > now)
        .sort((left, right) => new Date(right.startsAt) - new Date(left.startsAt));
    const activePeriod = periods[0];

    let reason = "open";
    let isOpen = settings.manualIsOpen !== false;
    let message = settings.customMessage || "";

    if (settings.closedTodayUntil && new Date(settings.closedTodayUntil) > now) {
        isOpen = false;
        reason = "closed-today";
        message ||= "Store is closed today. Ordering will resume tomorrow.";
    } else if (settings.orderingStartsAt && new Date(settings.orderingStartsAt) > now) {
        isOpen = false;
        reason = "not-open-yet";
        message ||= `Ordering opens ${new Date(settings.orderingStartsAt).toLocaleString()}.`;
    } else if (settings.orderingEndsAt && new Date(settings.orderingEndsAt) <= now) {
        isOpen = false;
        reason = "ordering-ended";
        message ||= "Ordering is currently closed.";
    } else if (activePeriod) {
        isOpen = activePeriod.isOpen === true;
        reason = isOpen ? "scheduled-open" : "scheduled-closed";
        message = activePeriod.message || message || (isOpen ? "Orders are currently being accepted." : "Ordering is temporarily closed.");
    } else if (!isOpen) {
        reason = "manually-closed";
        message ||= "The store is currently closed.";
    } else {
        message ||= "Ordering is open.";
    }

    return {
        isOpen,
        reason,
        message,
        nextChangeAt: activePeriod?.endsAt || settings.closedTodayUntil || settings.orderingStartsAt || null,
        settings
    };
};

export const ensureStoreCanAcceptOrders = async () => {
    const availability = await getStoreAvailability();
    if (!availability.isOpen) {
        const error = new Error(availability.message);
        error.status = 403;
        error.code = "STORE_CLOSED";
        throw error;
    }
    return availability;
};
