import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Boxes, CircleDollarSign, ClipboardList, Clock3, PackageCheck, Plus, Tags, Truck, Users } from "lucide-react";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

const currency = (amount) => `₹${(Number(amount) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const areaFor = (order) => [order.delivery_address?.area, order.delivery_address?.city, order.delivery_address?.village].filter(Boolean).join(", ") || "Address unavailable";

function AdminDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const response = await Axios(summaryApi.getAdminDashboard);
            if (response.data?.success !== true || !response.data.data?.stats) throw new Error(response.data?.message || "Dashboard data is unavailable.");
            setDashboard(response.data.data);
            setError("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.message || "Unable to load dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadDashboard(); }, []);

    if (loading) return <div className="flex min-h-64 items-center justify-center text-slate-500">Loading live store data…</div>;
    if (error) return <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"><p className="font-semibold">Dashboard unavailable</p><p className="mt-1 text-sm">{error}</p><button onClick={loadDashboard} className="mt-3 font-bold underline">Retry</button></div>;

    const stats = dashboard.stats;
    const metrics = [
        { label: "Today's sales", value: currency(stats.todaySales), icon: CircleDollarSign },
        { label: "Today's orders", value: stats.todayOrders, icon: PackageCheck },
        { label: "Pending orders", value: stats.pendingOrders, icon: Clock3 },
        { label: "Out for delivery", value: stats.outForDelivery, icon: Truck },
        { label: "Delivered today", value: stats.deliveredToday, icon: Activity },
        { label: "Customers", value: stats.totalCustomers, icon: Users },
        { label: "Low-stock products", value: stats.lowStockProducts, icon: Boxes }
    ];
    const quickActions = [
        { label: "Add product", to: "/dashboard/upload-product", icon: Plus },
        { label: "Browse products", to: "/dashboard/products", icon: Boxes },
        { label: "View orders", to: "/dashboard/all-orders", icon: ClipboardList },
        { label: "Manage categories", to: "/dashboard/category", icon: Tags },
        { label: "Manage riders", to: "/dashboard/riders", icon: Truck }
    ];
    const revenue = Array.isArray(dashboard.revenueByDay) ? dashboard.revenueByDay : [];
    const maxRevenue = Math.max(1, ...revenue.map((entry) => Number(entry.revenue) || 0));

    return (
        <section className="admin-dashboard-page space-y-6 p-4 sm:p-6">
            <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-800">PurainaMarket operations</p><h1 className="mt-1 text-2xl font-bold">Dashboard</h1><p className="mt-1 text-sm text-slate-600">Live order, sales, customer, and stock data.</p></div><button onClick={loadDashboard} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold">Refresh</button></header>
            <section className="admin-dashboard-metrics" aria-label="Store metrics">{metrics.map(({ label, value, icon: Icon }) => <article key={label} className="admin-dashboard-metric"><Icon size={18} aria-hidden="true" /><div><span>{label}</span><strong>{value ?? 0}</strong></div></article>)}</section>
            <section className="admin-dashboard-actions" aria-labelledby="admin-quick-actions-title">
                <h2 id="admin-quick-actions-title">Quick actions</h2>
                <nav aria-label="Dashboard quick actions">{quickActions.map(({ label, to, icon: Icon }) => <Link key={to} to={to}><Icon size={17} />{label}<ArrowUpRight size={14} /></Link>)}</nav>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Revenue overview</h2><p className="mt-1 text-xs text-slate-500">Paid and completed COD orders · last 7 days</p></div><CircleDollarSign size={20} className="text-emerald-800" /></div>{revenue.length ? <div className="mt-5 flex h-44 items-end gap-2 border-b border-slate-200 pb-1 sm:gap-4">{revenue.map((entry) => <div key={entry.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="max-w-full truncate text-[10px] font-semibold text-slate-500">{currency(entry.revenue)}</span><div title={`${entry.date}: ${currency(entry.revenue)}, ${entry.orders} orders`} className="w-full max-w-12 rounded-t-md bg-emerald-700" style={{ height: `${Math.max(3, ((Number(entry.revenue) || 0) / maxRevenue) * 100)}%` }} /><span className="text-[10px] text-slate-500">{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span></div>)}</div> : <p className="py-12 text-center text-sm text-slate-500">No revenue records yet.</p>}</div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between"><div><h2 className="font-bold">Low stock</h2><p className="mt-1 text-xs text-slate-500">Products with 5 or fewer units</p></div><Link to="/dashboard/products" className="text-xs font-bold text-emerald-800">Products <ArrowUpRight size={14} className="inline" /></Link></div>{dashboard.lowStockItems?.length ? <ul className="mt-4 divide-y divide-slate-100">{dashboard.lowStockItems.map((product) => <li key={product._id} className="flex justify-between gap-3 py-3 text-sm"><span className="truncate font-medium">{product.name || "Unnamed product"}</span><span className="shrink-0 font-bold text-amber-800">{product.stock ?? 0} {product.unit || "left"}</span></li>)}</ul> : <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">No low-stock products.</p>}</div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="font-bold">Recent orders</h2><p className="mt-1 text-xs text-slate-500">Latest customer orders</p></div><Link to="/dashboard/all-orders" className="text-sm font-bold text-emerald-800">All orders <ArrowUpRight size={15} className="inline" /></Link></div>{dashboard.recentOrders?.length ? <div className="divide-y divide-slate-100">{dashboard.recentOrders.map((order) => <Link key={order._id} to={`/dashboard/order-details/${encodeURIComponent(order.orderId)}`} className="grid gap-2 p-4 hover:bg-slate-50 sm:grid-cols-[1.1fr_1fr_1fr_.8fr] sm:items-center"><div><p className="font-bold">{order.orderId}</p><p className="text-xs text-slate-500">{order.userId?.name || "Customer unavailable"} · {order.userId?.mobile || "No phone"}</p></div><p className="flex items-center gap-1 text-sm text-slate-600"><Truck size={14} />{areaFor(order)}</p><p className="text-sm">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Date unavailable"}</p><div className="flex items-center justify-between gap-2 sm:justify-end"><span className="text-sm font-bold">{currency(order.totalAmt)}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{order.order_status}</span></div></Link>)}</div> : <p className="p-8 text-center text-sm text-slate-500">No orders have been placed yet.</p>}</section>
        </section>
    );
}

export default AdminDashboard;