import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

const orderLabel = (order) => order?.order_status || "No order yet";

function AdminReferrals() {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Axios(summaryApi.getAdminReferrals)
            .then((response) => {
                if (response.data?.success) setReferrals(response.data.data || []);
                else throw new Error(response.data?.message || "Could not load referral history.");
            })
            .catch((error) => toast.error(error.response?.data?.message || error.message || "Could not load referral history."))
            .finally(() => setLoading(false));
    }, []);

    return <section className="admin-managed-page space-y-4">
        <header className="admin-management-heading"><div><p>Customer growth</p><h2>Referral history</h2><span>Referral attribution, qualifying orders, and reward coupons.</span></div><span className="admin-coupon-count"><Users size={15} /> {referrals.length} referrals</span></header>
        <section className="admin-coupon-list">
            <header className="admin-coupon-list-header"><div><h2>All referrals</h2><p>Rewards are issued once after a referred customer’s qualifying delivered order.</p></div></header>
            {loading ? <p className="admin-loading-state">Loading referral history…</p> : referrals.length ? <div className="admin-coupon-list-items">{referrals.map((referral) => {
                const order = referral.qualifyingOrderId || referral.latestOrderId;
                const coupon = referral.rewardCouponId;
                return <article key={referral._id} className="admin-coupon-row">
                    <div className="admin-coupon-row-main"><strong>{referral.inviterId?.name || "Unknown referrer"}</strong><span>invited</span><strong>{referral.referredUserId?.name || "Unknown customer"}</strong><span className={`admin-coupon-status ${referral.status === "Rewarded" ? "is-active" : "is-inactive"}`}>{referral.status || "Pending"}</span></div>
                    <div className="admin-coupon-row-meta"><span>Qualifying order: {referral.qualifyingOrderId ? orderLabel(referral.qualifyingOrderId) : orderLabel(referral.latestOrderId)}</span><span>{order?.orderId ? `Order ${order.orderId}` : "No qualifying order recorded"}</span><span>{coupon?.code ? `Coupon ${coupon.code}` : "Reward not issued"}</span><span>{referral.createdAt ? new Date(referral.createdAt).toLocaleDateString() : ""}</span></div>
                </article>;
            })}</div> : <div className="admin-empty-state">No referral history yet.</div>}
        </section>
    </section>;
}

export default AdminReferrals;
