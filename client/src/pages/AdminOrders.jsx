import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import { getOrderPaymentMethod, getOrderPaymentStatus } from "../utils/printOrderReceipt";

const currency = (amount) => `₹${(Number(amount) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const dateText = (date) => date ? new Date(date).toLocaleString() : "Date unavailable";

function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All statuses");
    const [payment, setPayment] = useState("All payments");
    const [paymentState, setPaymentState] = useState("All payment states");
    const [dateRange, setDateRange] = useState("Any date");
    const [sort, setSort] = useState("Newest first");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cancellingOrderId, setCancellingOrderId] = useState("");

    useEffect(() => {
        let active = true;
        Axios(summaryApi.getAllOrdersAdmin).then((response) => {
            if (!active) return;
            if (response.data?.success !== true || !Array.isArray(response.data.orders)) throw new Error(response.data?.message || "Could not load orders.");
            setOrders(response.data.orders);
        }).catch((requestError) => {
            if (active) setError(requestError.response?.data?.message || requestError.message || "Could not load orders.");
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const visibleOrders = useMemo(() => {
        const searchText = search.trim().toLowerCase();
        const rangeStart = dateRange === "Today" ? new Date(new Date().setHours(0, 0, 0, 0)) : dateRange === "7 days" ? new Date(Date.now() - 7 * 86400000) : dateRange === "30 days" ? new Date(Date.now() - 30 * 86400000) : null;
        const filtered = orders.filter((order) => {
            const customer = order.userId || {};
            const searchMatches = !searchText || [order.orderId, customer.name, customer.email, customer.mobile].some((value) => String(value || "").toLowerCase().includes(searchText));
            const statusMatches = status === "All statuses" || order.order_status === status;
            const paymentMatches = payment === "All payments" || getOrderPaymentMethod(order) === payment;
            const currentPaymentState = getOrderPaymentStatus(order);
            const stateMatches = paymentState === "All payment states" || currentPaymentState === paymentState;
            const dateMatches = !rangeStart || new Date(order.createdAt) >= rangeStart;
            return searchMatches && statusMatches && paymentMatches && stateMatches && dateMatches;
        });
        return filtered.sort((a, b) => {
            if (sort === "Oldest first") return new Date(a.createdAt) - new Date(b.createdAt);
            if (sort === "Highest total") return Number(b.totalAmt) - Number(a.totalAmt);
            if (sort === "Lowest total") return Number(a.totalAmt) - Number(b.totalAmt);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [orders, search, status, payment, paymentState, dateRange, sort]);

    const controls = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";
    const orderStatuses = ["Pending", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned"];
    const cancelOrder = async (order) => {
        const cancellationReason = window.prompt(`Reason for cancelling order ${order.orderId}:`);
        if (cancellationReason === null) return;
        if (!cancellationReason.trim()) { window.alert("Enter a cancellation reason."); return; }
        setCancellingOrderId(order._id);
        try {
            const response = await Axios({ ...summaryApi.updateOrderStatusAdmin, data: { orderId: order._id, order_status: "Cancelled", cancellationReason: cancellationReason.trim() } });
            if (response.data?.success !== true) throw new Error(response.data?.message || "Could not cancel this order.");
            const updatedOrder = response.data.updatedOrder;
            setOrders((current) => current.map((currentOrder) => currentOrder._id === order._id ? { ...currentOrder, ...updatedOrder } : currentOrder));
        } catch (requestError) {
            window.alert(requestError.response?.data?.message || requestError.message || "Could not cancel this order.");
        } finally { setCancellingOrderId(""); }
    };

    return (
        <section className="space-y-4 p-4 sm:p-6">
            <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-800">Operations</p><h1 className="mt-1 text-2xl font-bold">Orders</h1><p className="mt-1 text-sm text-slate-600">Monitor customer orders and rider delivery progress.</p></div><p className="text-sm font-semibold text-slate-600">{visibleOrders.length} of {orders.length} orders</p></header>
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-3">
                <label className="relative sm:col-span-2 xl:col-span-1"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input className={`${controls} pl-9`} placeholder="Order ID, customer, phone" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                <select className={controls} value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{orderStatuses.map((value) => <option key={value}>{value}</option>)}</select>
                <select className={controls} value={payment} onChange={(event) => setPayment(event.target.value)}><option>All payments</option>{["Cash on Delivery", "Stripe", "Razorpay", "Online payment"].map((value) => <option key={value}>{value}</option>)}</select>
                <select className={controls} value={paymentState} onChange={(event) => setPaymentState(event.target.value)}><option>All payment states</option>{["Paid", "Pending", "COD Pending", "COD Collected"].map((value) => <option key={value}>{value}</option>)}</select>
                <select className={controls} value={dateRange} onChange={(event) => setDateRange(event.target.value)}>{["Any date", "Today", "7 days", "30 days"].map((value) => <option key={value}>{value}</option>)}</select>
                <select className={controls} value={sort} onChange={(event) => setSort(event.target.value)}>{["Newest first", "Oldest first", "Highest total", "Lowest total"].map((value) => <option key={value}>{value}</option>)}</select>
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading orders…</div> : !visibleOrders.length ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">{orders.length ? "No orders match these filters." : "No orders have been placed yet."}</div> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="hidden grid-cols-[1.15fr_1fr_1fr_.75fr_1fr_.8fr] gap-3 border-b bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500 lg:grid"><span>Order / customer</span><span>Date</span><span>Payment</span><span>Total</span><span>Status / rider</span><span>Details</span></div>{visibleOrders.map((order) => { const customer = order.userId || {}; const address = order.delivery_address || {}; const canCancel = ["Pending", "Processing", "Shipped", "Out for Delivery"].includes(order.order_status); return <article key={order._id} className="grid gap-3 border-b border-slate-100 p-4 last:border-0 lg:grid-cols-[1.15fr_1fr_1fr_.75fr_1fr_.8fr] lg:items-center"><div><p className="font-bold">{order.orderId}</p><p className="text-sm text-slate-700">{customer.name || "Customer unavailable"}</p><p className="text-xs text-slate-500">{customer.mobile || "No phone"} · {[address.area, address.city].filter(Boolean).join(", ") || "Area unavailable"}</p></div><p className="text-sm text-slate-600">{dateText(order.createdAt)}</p><div><p className="text-sm font-medium">{getOrderPaymentMethod(order)}</p><p className="text-xs text-slate-500">{getOrderPaymentStatus(order)}</p></div><p className="font-bold">{currency(order.totalAmt)}</p><div><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{order.order_status}</span><p className="mt-1 text-xs text-slate-600">Rider: {order.riderId?.name || "Not accepted"}</p>{order.acceptedAt && <p className="text-xs text-slate-500">Accepted {dateText(order.acceptedAt)}</p>}</div><div className="flex flex-wrap gap-2"><Link to={`/dashboard/order-details/${encodeURIComponent(order.orderId)}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold text-emerald-800">Open <ArrowUpRight size={15} /></Link>{canCancel && <button type="button" disabled={Boolean(cancellingOrderId)} onClick={() => cancelOrder(order)} className="min-h-10 rounded-lg border border-red-300 px-3 text-sm font-bold text-red-700 disabled:opacity-50">{cancellingOrderId === order._id ? "Cancelling…" : "Cancel Order"}</button>}</div></article>; })}</div>}
        </section>
    );
}

export default AdminOrders;
