/* Rider API cards use server payloads whose shape is checked at runtime. */
/* eslint react/prop-types: off */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, MapPin, PackageCheck, RefreshCw, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import { getOrderPaymentMethod, getOrderPaymentStatus } from "../utils/printOrderReceipt";

const currency = (amount) => `₹${(Number(amount) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const getArea = (order) => [order?.delivery_address?.area, order?.delivery_address?.city, order?.delivery_address?.village].filter(Boolean).join(", ") || "Area not provided";
const getItemCount = (order) => (order?.itemList || []).reduce((count, item) => count + (item.sellingType === "loose" ? 1 : Number(item.quantity) || 0), 0);
const getOrderTime = (date) => date ? new Date(date).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Time unavailable";

function OrderCard({ order, active = false, onCancel, cancelling = false }) { // eslint-disable-line react/prop-types
    const paymentStatus = getOrderPaymentStatus(order);

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-base font-bold">Order #{order.orderId}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin size={15} />{getArea(order)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-blue-100 text-blue-800" : paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                    {active ? "OUT FOR DELIVERY" : getOrderPaymentMethod(order) === "Cash on Delivery" ? `COD · COLLECT ${currency(order.totalAmt)}` : "PAID ONLINE"}
                </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-slate-500">Order total</p><p className="font-bold">{currency(order.totalAmt)}</p></div>
                <div><p className="text-xs text-slate-500">Items</p><p className="font-semibold">{getItemCount(order)}</p></div>
                <div className="col-span-2 sm:col-span-1"><p className="text-xs text-slate-500">Placed</p><p className="font-semibold">{getOrderTime(order.createdAt)}</p></div>
            </div>
            <Link to={`/rider/orders/${encodeURIComponent(order._id)}`} className="mt-4 flex min-h-12 items-center justify-center rounded-lg bg-emerald-800 px-4 font-bold text-white hover:bg-emerald-900">
                {active ? "Open active delivery" : "View full order"}
            </Link>
            {onCancel && <button type="button" disabled={cancelling} onClick={onCancel} className="mt-2 min-h-11 w-full rounded-lg border border-red-300 bg-white px-4 font-bold text-red-700 disabled:opacity-50">{cancelling ? "Cancelling…" : "Cancel Order"}</button>}
        </article>
    );
}

function RiderDashboard() {
    const rider = useSelector((state) => state.user);
    const [dashboard, setDashboard] = useState({ availableOrders: [], activeOrders: [], completedToday: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [cancellingOrderId, setCancellingOrderId] = useState("");
    const previousAvailableIds = useRef(null);

    const loadDashboard = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true);
        else setLoading(true);
        try {
            const response = await Axios(summaryApi.getRiderDashboard);
            if (response.data?.success !== true || !response.data.data) {
                throw new Error(response.data?.message || "Could not load delivery orders.");
            }
            const nextDashboard = {
                availableOrders: Array.isArray(response.data.data.availableOrders) ? response.data.data.availableOrders : [],
                activeOrders: Array.isArray(response.data.data.activeOrders) ? response.data.data.activeOrders : response.data.data.activeOrder ? [response.data.data.activeOrder] : [],
                completedToday: Array.isArray(response.data.data.completedToday) ? response.data.data.completedToday : [],
                stats: response.data.data.stats || {}
            };
            const availableIds = new Set(nextDashboard.availableOrders.map((order) => order._id));
            if (previousAvailableIds.current) {
                const newOrders = nextDashboard.availableOrders.filter((order) => !previousAvailableIds.current.has(order._id));
                newOrders.forEach((order) => {
                    toast.success(`New delivery available: ${order.orderId}`);
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("PurainaMarket delivery", { body: `Order ${order.orderId} · ${currency(order.totalAmt)}` });
                    }
                });
            }
            previousAvailableIds.current = availableIds;
            setDashboard(nextDashboard);
            setError("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.message || "Unable to load delivery dashboard.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") loadDashboard(true);
        }, 15000);
        return () => window.clearInterval(timer);
    }, [loadDashboard]);

    const enableNotifications = async () => {
        if (!("Notification" in window)) {
            toast.error("Browser notifications are not supported on this device.");
            return;
        }
        const permission = await Notification.requestPermission();
        toast(permission === "granted" ? "New delivery alerts enabled." : "Notifications were not enabled.");
    };

    const cancelAvailableOrder = async (order) => {
        const cancellationReason = window.prompt(`Reason for cancelling order ${order.orderId}:`);
        if (cancellationReason === null) return;
        if (!cancellationReason.trim()) { toast.error("Enter a cancellation reason."); return; }
        setCancellingOrderId(order._id);
        try {
            const response = await Axios({ ...summaryApi.cancelRiderOrder(order._id), data: { cancellationReason: cancellationReason.trim() } });
            if (response.data?.success !== true) throw new Error(response.data?.message || "Could not cancel this order.");
            toast.success("Order cancelled.");
            await loadDashboard(true);
        } catch (requestError) {
            const message = requestError.response?.data?.message || requestError.message || "Could not cancel this order.";
            toast.error(message);
        } finally { setCancellingOrderId(""); }
    };

    const stats = dashboard.stats;
    const statItems = [
        { label: "Available orders", value: stats.availableOrders ?? dashboard.availableOrders.length, icon: PackageCheck },
        { label: "Active orders", value: stats.activeOrder ?? dashboard.activeOrders.length, icon: Truck },
        { label: "Completed today", value: stats.completedToday ?? dashboard.completedToday.length, icon: PackageCheck },
        { label: "COD to collect", value: currency(stats.codToCollect), icon: MapPin }
    ];

    return (
        <div className="space-y-7">
            <div className="flex flex-wrap items-end justify-between gap-3 pt-3">
                <div><p className="text-sm font-semibold text-emerald-800">Rider dashboard</p><h1 className="mt-1 text-2xl font-bold">Hello, {rider.name || "Rider"}</h1><p className="mt-1 text-sm text-slate-600">Your deliveries, ready to go.</p></div>
                <div className="flex gap-2">
                    <button onClick={enableNotifications} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"><Bell size={17} /><span className="hidden sm:inline">Enable alerts</span></button>
                    <button onClick={() => loadDashboard(true)} disabled={refreshing} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /><span className="hidden sm:inline">Refresh</span></button>
                </div>
            </div>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {statItems.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2 text-slate-500"><span className="text-xs font-medium sm:text-sm">{label}</span><Icon size={18} className="shrink-0 text-emerald-800" /></div><p className="mt-3 text-2xl font-bold">{value}</p></div>)}
            </section>

            {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button onClick={() => loadDashboard()} className="font-bold underline">Retry</button></div>}
            {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading live orders…</div> : (
                <div className="grid gap-7 lg:grid-cols-[1.1fr_.9fr]">
                    <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Available orders</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">{dashboard.availableOrders.length}</span></div>
                        {dashboard.availableOrders.length ? dashboard.availableOrders.map((order) => <OrderCard key={order._id} order={order} onCancel={() => cancelAvailableOrder(order)} cancelling={cancellingOrderId === order._id} />) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="font-semibold">No available deliveries</p><p className="mt-1 text-sm text-slate-500">New customer orders will appear here automatically.</p></div>}
                    </section>
                    <div className="space-y-7">
                        <section className="space-y-3"><h2 className="text-lg font-bold">Active deliveries</h2>{dashboard.activeOrders.length ? dashboard.activeOrders.map((order) => <OrderCard key={order._id} order={order} active />) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">You have no active deliveries.</div>}</section>
                        <section className="space-y-3"><h2 className="text-lg font-bold">Completed today</h2>{dashboard.completedToday.length ? dashboard.completedToday.slice(0, 5).map((order) => <OrderCard key={order._id} order={order} />) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Completed deliveries will appear here.</div>}</section>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RiderDashboard;
