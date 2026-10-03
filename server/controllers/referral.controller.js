import ReferralModel from "../models/referral.model.js";

export const listAdminReferralsController = async (_req, res) => {
    try {
        const referrals = await ReferralModel.find()
            .populate("inviterId", "name email")
            .populate("referredUserId", "name email")
            .populate("qualifyingOrderId", "orderId order_status subTotalAmt totalAmt")
            .populate("latestOrderId", "orderId order_status subTotalAmt totalAmt")
            .populate("rewardCouponId", "code discountType discountValue expiresAt isActive")
            .sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, error: false, data: referrals });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to load referral history." });
    }
};
