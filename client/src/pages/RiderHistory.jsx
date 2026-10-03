import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

const currency = (amount) => `₹${(Number(amount) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const areaFor = (order) => [order.delivery_address?.area, order.delivery_address?.city].filter(Boolean).join(", ") || "Area not provided";

function RiderHistory() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        Axios(summaryApi.getRiderHistory).then((response) => {
            if (!active) return;
            if (response.data?.success !== true || !Array.isArray(response.data.data)) throw new Error(response.data?.message || "Could not load delivery history.");
            setOrders(response.data.data);
        }).catch((requestError) => {
            if (active) setError(requestError.response?.data?.message || requestError.message || "Could not load delivery history.");
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    return <div className="space-y-4 pt-4"><div><p className="text-sm font-semibold text-emerald-800">Rider account</p><h1 className="mt-1 text-2xl font-bold">Delivery history</h1></div>{loading ? <p className="rounded-xl border bg-white p-6 text-slate-500">Loading completed deliveries…</p> : error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p> : orders.length ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{orders.map((order) => <Link key={order._id} to={`/rider/orders/${encodeURIComponent(order._id)}`} className="grid gap-2 border-b border-slate-100 p-4 last:border-0 sm:grid-cols-[1.1fr_1fr_1fr_1fr]"><span className="font-bold">#{order.orderId}</span><span className="flex items-center gap-1 text-sm text-slate-600"><MapPin size={15} />{areaFor(order)}</span><span className="text-sm">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : "Completed"}</span><span className="text-sm font-semibold">{currency(order.totalAmt)} · {order.payment_type}</span></Link>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No completed deliveries yet.</div>}</div>;
}

export default RiderHistory;