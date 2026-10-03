import { useEffect, useState } from "react";
import { Copy, Share2, Users } from "lucide-react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

const orderStatus = (referral) => referral.qualifyingOrderId?.order_status
    || referral.latestOrderId?.order_status
    || "No qualifying order yet";

function MyReferrals() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const referralLink = data?.referralCode ? `${window.location.origin}/?ref=${encodeURIComponent(data.referralCode)}` : "";

    useEffect(() => {
        Axios({ ...summaryApi.getMyReferrals })
            .then((response) => { if (response.data?.success) setData(response.data.data); })
            .catch((error) => toast.error(error.response?.data?.message || "Unable to load referral details."))
            .finally(() => setLoading(false));
    }, []);

    const share = async () => {
        try {
            if (navigator.share) await navigator.share({ title: "Join me at PurainaMarket", text: `Use my referral code ${data.referralCode} when you join.`, url: referralLink });
            else {
                await navigator.clipboard.writeText(referralLink);
                toast.success("Referral link copied.");
            }
        } catch (error) {
            if (error.name !== "AbortError") toast.error("Could not share the referral link.");
        }
    };

    return (
        <section className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
            <header><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Your account</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Referrals</h1><p className="mt-1 text-sm text-slate-600">Invite friends and earn a coupon when they complete a qualifying order.</p></header>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
                <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-emerald-800"><Share2 size={21}/></span><div><h2 className="font-bold text-slate-900">Your referral link</h2><p className="text-sm text-slate-600">Your code: <strong>{data?.referralCode || "Loading…"}</strong></p></div></div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row"><p className="min-w-0 flex-1 break-all rounded-xl border border-emerald-100 bg-white p-3 text-sm text-slate-700">{referralLink || "Preparing your link…"}</p><button type="button" disabled={!referralLink} onClick={share} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white disabled:opacity-50"><Share2 size={17}/> Share</button><button type="button" disabled={!referralLink} onClick={() => navigator.clipboard?.writeText(referralLink).then(() => toast.success("Referral link copied."))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-900 disabled:opacity-50"><Copy size={17}/> Copy</button></div>
            </div>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-bold text-slate-900">People you invited</h2><p className="text-sm text-slate-500">Names, order progress, and earned rewards.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700"><Users size={15}/>{data?.totalInvited || 0}</span></div>
                {loading ? <p className="p-6 text-sm text-slate-500">Loading referrals…</p> : data?.referrals?.length ? <div className="divide-y divide-slate-100">{data.referrals.map((referral) => <article key={referral._id} className="grid gap-2 p-4 sm:grid-cols-[1fr_1fr_1fr] sm:items-center"><div><p className="font-semibold text-slate-900">{referral.referredUserId?.name || "PurainaMarket customer"}</p><p className="text-xs text-slate-500">Invited {new Date(referral.createdAt).toLocaleDateString()}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Order status</p><p className="text-sm font-medium text-slate-700">{orderStatus(referral)}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-500">Referral reward</p><p className="text-sm font-semibold text-emerald-800">{referral.rewardCouponId?.code || (referral.status === "Rewarded" ? "Coupon issued" : "Pending qualifying order")}</p></div></article>)}</div> : <div className="p-8 text-center"><p className="font-semibold text-slate-800">No invitations yet</p><p className="mt-1 text-sm text-slate-500">Share your link to invite your first friend.</p></div>}
            </section>
        </section>
    );
}

export default MyReferrals;
