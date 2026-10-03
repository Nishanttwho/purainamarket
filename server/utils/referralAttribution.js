import UserModel from "../models/user.model.js";
import ReferralModel from "../models/referral.model.js";

export class ReferralAttributionError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export const normalizeReferralCode = (value) => typeof value === "string" ? value.trim().toUpperCase() : "";

export const findReferralInviter = async (codeValue) => {
    const code = normalizeReferralCode(codeValue);
    if (!code) return null;
    if (!/^[A-Z0-9_-]{2,64}$/.test(code)) throw new ReferralAttributionError("That referral code is invalid.");
    const inviter = await UserModel.findOne({ referralCode: code, role: "USER", status: "Active" }).select("_id");
    if (!inviter) throw new ReferralAttributionError("That referral code is invalid.");
    return inviter;
};

export const recordReferralAttribution = async ({ inviter, referredUserId, referralCode }) => {
    if (!inviter) return null;
    if (inviter._id.toString() === referredUserId.toString()) throw new ReferralAttributionError("You cannot use your own referral code.");
    try {
        return await ReferralModel.create({ inviterId: inviter._id, referredUserId, referralCode: normalizeReferralCode(referralCode) });
    } catch (error) {
        if (error?.code !== 11000) throw error;
        const existing = await ReferralModel.findOne({ referredUserId }).lean();
        if (existing?.inviterId?.toString() === inviter._id.toString()) return existing;
        throw new ReferralAttributionError("This account already has referral attribution.", 409);
    }
};
