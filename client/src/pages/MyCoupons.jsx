import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TicketPercent } from "lucide-react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

const currency = (amount) => `₹${(Number(amount) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const statusLabel = { available: "Available", used: "Used", expired: "Expired", scheduled: "Starts soon" };
const statusStyle = { available: "bg-emerald-50 text-emerald-800", used: "bg-slate-100 text-slate-600", expired: "bg-rose-50 text-rose-700", scheduled: "bg-amber-50 text-amber-800" };

function MyCoupons() {
    const navigate = useNavigate();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Axios({ ...summaryApi.getMyCoupons })
            .then((response) => { if (response.data?.success) setCoupons(response.data.data || []); })
            .catch((error) => toast.error(error.response?.data?.message || "Unable to load coupons."))
            .finally(() => setLoading(false));
    }, []);

    return (
        <section className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
            <header><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Your account</p><h1 className="mt-1 text-2xl font-bold text-slate-900">My Coupons</h1><p className="mt-1 text-sm text-slate-600">Your available offers and rewards.</p></header>
            {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your coupons…</div> : coupons.length ? <div className="grid gap-3 sm:grid-cols-2">{coupons.map((coupon) => <article key={coupon._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><TicketPercent size={21}/></span><div className="min-w-0"><p className="truncate font-bold tracking-wide text-slate-900">{coupon.code}</p><p className="text-xs text-slate-500">{coupon.reason}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[coupon.status]}`}>{statusLabel[coupon.status]}</span></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div><p className="text-xs text-slate-500">Discount</p><p className="font-semibold text-slate-800">{coupon.discountType === "percentage" ? `${coupon.discountValue}% off${coupon.maximumDiscount ? ` · max ${currency(coupon.maximumDiscount)}` : ""}` : `${currency(coupon.discountValue)} off`}</p></div><div><p className="text-xs text-slate-500">Minimum order</p><p className="font-semibold text-slate-800">{currency(coupon.minimumOrderValue)}</p></div><div className="col-span-2"><p className="text-xs text-slate-500">Expiry</p><p className="font-semibold text-slate-800">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "No expiry"}</p></div></div><button type="button" disabled={coupon.status !== "available"} onClick={() => navigate("/cart", { state: { couponCode: coupon.code, applyCoupon: true } })} className="mt-4 min-h-11 w-full rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300">Apply</button></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><TicketPercent className="mx-auto text-slate-400" size={28}/><p className="mt-2 font-semibold text-slate-800">No coupons yet</p><p className="mt-1 text-sm text-slate-500">Coupons and referral rewards will appear here.</p></div>}
        </section>
    );
}

export default MyCoupons;
