import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ExternalLink, MapPin, Phone, Printer } from "lucide-react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import { formatOrderItemQuantity, getOrderPaymentMethod, getOrderPaymentStatus, printOrderReceipt } from "../utils/printOrderReceipt";

const currency = (amount) => `₹${(Number(amount) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const addressLines = (address = {}) => [address.flatHouseNumber, address.floor, address.street, address.area, address.landmark, address.city, address.state, address.pincode, address.country].filter(Boolean);
const itemLineTotal = (item) => {
    if (item.linePrice !== null && item.linePrice !== undefined) return Number(item.linePrice) || 0;
    const product = item.productId;
    if (!product) return 0;
    if (item.sellingType === "loose") return item.purchaseMode === "amount" ? Number(item.amount) || 0 : (Number(product.pricePerKg) || 0) * (Number(item.selectedWeightKg) || 0);
    return (Number(product.price) || 0) * (Number(item.quantity) || 0) * (1 - (Number(product.discount) || 0) / 100);
};

function RiderOrderDetails() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const loadOrder = useCallback(async () => {
        setLoading(true);
        try {
            const response = await Axios(summaryApi.getRiderOrder(orderId));
            if (response.data?.success !== true || !response.data.data) throw new Error(response.data?.message || "Could not load this order.");
            setOrder(response.data.data);
            setError("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.message || "Could not load this order.");
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => { loadOrder(); }, [loadOrder]);

    const performAction = async (action, successMessage, data) => {
        setBusy(true);
        try {
            const response = await Axios({ ...action(orderId), ...(data ? { data } : {}) });
            if (response.data?.success !== true) throw new Error(response.data?.message || "The order could not be updated.");
            toast.success(response.data.message || successMessage);
            if (action === summaryApi.deliverRiderOrder) navigate("/rider", { replace: true });
            else await loadOrder();
        } catch (requestError) {
            const message = requestError.response?.data?.message || requestError.message || "The order could not be updated.";
            setError(message);
            toast.error(message);
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="py-16 text-center text-slate-500">Loading order…</div>;
    if (!order) return <div className="space-y-4 py-8"><Link to="/rider" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={18} /> Back to deliveries</Link><div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error || "Order not found."}</div></div>;

    const address = order.delivery_address || {};
    const customer = order.userId || {};
    const phone = customer.mobile || address.mobileNumber;
    const isAvailable = ["Pending", "Processing", "Shipped"].includes(order.order_status) && !order.riderId;
    const isActive = order.order_status === "Out for Delivery";
    const paymentMethod = getOrderPaymentMethod(order);
    const isCOD = paymentMethod === "Cash on Delivery";
    const paymentStatus = getOrderPaymentStatus(order);
    const items = Array.isArray(order.itemList) ? order.itemList : [];
    const itemTotal = items.reduce((sum, item) => sum + itemLineTotal(item), 0);
    const subtotal = Number(order.subTotalAmt) || itemTotal;
    const discount = Math.max(0, subtotal - itemTotal);
    const mapsQuery = address.latitude && address.longitude ? `${address.latitude},${address.longitude}` : addressLines(address).join(", ");
    const cancelOrder = () => {
        const cancellationReason = window.prompt("Please provide a reason for cancelling this delivery.");
        if (cancellationReason === null) return;
        if (!cancellationReason.trim()) { toast.error("Enter a cancellation reason."); return; }
        performAction(summaryApi.cancelRiderOrder, "Order cancelled.", { cancellationReason: cancellationReason.trim() });
    };

    return (
        <div className="mx-auto max-w-3xl space-y-4 py-4">
            <div className="flex items-center justify-between gap-3"><button onClick={() => navigate(-1)} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 font-semibold"><ArrowLeft size={18} /> Back</button><button onClick={() => printOrderReceipt(order)} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 font-semibold"><Printer size={18} /> Print bill</button></div>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-emerald-800">{isAvailable ? "Available delivery" : order.order_status}</p><h1 className="mt-1 text-xl font-bold">Order #{order.orderId}</h1><p className="mt-1 text-sm text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "Time unavailable"}</p></div><div className="text-right"><p className="text-xs text-slate-500">Final total</p><p className="text-2xl font-bold">{currency(order.totalAmt)}</p></div></div>
                <div className={`mt-4 rounded-lg p-4 font-bold ${isCOD && paymentStatus !== "COD Collected" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>{isCOD ? paymentStatus === "COD Collected" ? "COD COLLECTED" : `COLLECT ${currency(order.totalAmt)}` : "PAID ONLINE"}<span className="mt-1 block text-xs font-medium">{paymentMethod} · {paymentStatus}</span></div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-bold">Customer</h2><p className="mt-3 font-semibold">{customer.name || address.name || "Name not provided"}</p><p className="mt-1 text-sm text-slate-600">{phone || "Phone not provided"}</p>{phone && <a className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-800 px-4 font-bold text-white" href={`tel:${phone}`}><Phone size={18} /> Call customer</a>}</div>
                <div className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-bold">Delivery</h2><p className="mt-3 flex gap-2 text-sm leading-6 text-slate-700"><MapPin className="mt-1 shrink-0" size={17} />{addressLines(address).join(", ") || "Address not provided"}</p>{mapsQuery && <a className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}><ExternalLink size={17} /> Navigate</a>}</div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6"><h2 className="text-lg font-bold">Items ({items.length})</h2><div className="mt-3 divide-y divide-slate-100">{items.map((item, index) => { const product = item.productId || {}; return <div key={item._id || `${product._id}-${index}`} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="font-semibold">{product.name || "Product details unavailable"}</p><p className="mt-1 text-sm text-slate-500">{formatOrderItemQuantity(item)}{product.unit && item.sellingType !== "loose" ? ` · ${product.unit}` : ""}</p><p className="mt-1 text-xs text-slate-500">Unit price: {item.sellingType === "loose" && item.purchaseMode === "weight" ? `${currency(product.pricePerKg)} / kg` : currency(product.price)}</p></div><p className="shrink-0 font-bold">{currency(itemLineTotal(item))}</p></div>; })}</div>
                <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{currency(subtotal)}</span></div><div className="flex justify-between"><span>Discount</span><span>−{currency(discount)}</span></div><div className="flex justify-between"><span>Delivery charge{order.deliveryAreaName ? ` · ${order.deliveryAreaName}` : ""}</span><span>{currency(order.deliveryCharge ?? order.otherCharge)}</span></div>{order.deliverySavings > 0 && <div className="flex justify-between text-emerald-700"><span>Free delivery savings</span><span>−{currency(order.deliverySavings)}</span></div>}<div className="flex justify-between"><span>Handling charge</span><span>{currency(order.handlingCharge ?? Math.max(0, Number(order.otherCharge) - Number(order.deliveryCharge || 0)))}</span></div>{order.delivery_time && <p className="text-xs text-slate-500">Estimated delivery: about {order.delivery_time} minutes</p>}<div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold"><span>Final total</span><span>{currency(order.totalAmt)}</span></div></div>
            </section>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
            {isAvailable && <button disabled={busy} onClick={() => performAction(summaryApi.acceptRiderOrder, "Order accepted.")} className="min-h-14 w-full rounded-xl bg-emerald-800 px-5 text-lg font-bold text-white disabled:opacity-60">{busy ? "Accepting…" : "ACCEPT ORDER"}</button>}
            {isActive && isCOD && paymentStatus !== "COD Collected" && <button disabled={busy} onClick={() => performAction(summaryApi.collectRiderCOD, "COD collection recorded.")} className="min-h-14 w-full rounded-xl bg-amber-500 px-5 text-lg font-bold text-amber-950 disabled:opacity-60">{busy ? "Recording…" : `RECORD ${currency(order.totalAmt)} COLLECTED`}</button>}
            {isActive && <button disabled={busy || (isCOD && paymentStatus !== "COD Collected")} onClick={() => performAction(summaryApi.deliverRiderOrder, "Delivery completed.")} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 text-lg font-bold text-white disabled:opacity-50"><Check size={20} />{busy ? "Updating…" : "MARK DELIVERED"}</button>}
            {(isActive || isAvailable) && <button disabled={busy} onClick={cancelOrder} className="min-h-12 w-full rounded-xl border border-red-300 bg-white px-5 font-bold text-red-700 disabled:opacity-50">Cancel Order</button>}
            {order.order_status === "Cancelled" && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><strong>Order cancelled.</strong>{order.cancellationReason && <p className="mt-1">Reason: {order.cancellationReason}</p>}</div>}
        </div>
    );
}

export default RiderOrderDetails;
