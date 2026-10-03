import mongoose from "mongoose";

const schedulePeriodSchema = new mongoose.Schema({
    label: { type: String, trim: true, maxlength: 80, default: "" },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    isOpen: { type: Boolean, default: false },
    message: { type: String, trim: true, maxlength: 240, default: "" }
}, { _id: true });

const storeSettingsSchema = new mongoose.Schema({
    key: { type: String, default: "store", unique: true },
    manualIsOpen: { type: Boolean, default: true },
    closedTodayUntil: { type: Date, default: null },
    orderingStartsAt: { type: Date, default: null },
    orderingEndsAt: { type: Date, default: null },
    customMessage: { type: String, trim: true, maxlength: 240, default: "" },
    schedulePeriods: { type: [schedulePeriodSchema], default: [] }
}, { timestamps: true });

export default mongoose.model("storeSettings", storeSettingsSchema);
