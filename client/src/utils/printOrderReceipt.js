import { getLoosePricePerKg } from "./loosePricing";

const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatCurrency = (value) => `₹${(Number(value) || 0).toFixed(2)}`;

export const getLineTotal = (item) => {
    if (item?.linePrice !== null && item?.linePrice !== undefined && Number.isFinite(Number(item.linePrice))) return Number(item.linePrice);
    const product = item?.productId;
    if (!product) return 0;
    if (item.sellingType === "loose") {
        if (item.purchaseMode === "amount") return Number(item.amount) || 0;
        return getLoosePricePerKg(product) * (Number(item.selectedWeightKg) || 0);
    }
    return (Number(product.price) || 0) * (Number(item.quantity) || 0) * (1 - (Number(product.discount) || 0) / 100);
};

export const getOrderPaymentStatus = (order) => {
    if (order?.paymentStatus) return order.paymentStatus;
    if (order?.paymentId) return "Paid";
    if (order?.payment_type === "Cash on Delivery") return "COD Pending";
    return "Pending";
};

export const formatOrderItemQuantity = (item) => {
    if (item?.sellingType === "loose") {
        if (item.purchaseMode === "amount") return `${formatCurrency(item.amount)} purchase`;
        return `${Number(item.selectedWeightKg) || 0} kg`;
    }
    const quantity = Number(item?.quantity) || 0;
    const unit = item?.productId?.unit;
    return `${quantity}${unit ? ` ${unit}` : " unit(s)"}`;
};

export const printOrderReceipt = (order) => {
    if (!order) return false;

    const printWindow = window.open("", "_blank", "width=760,height=820");
    if (!printWindow) return false;

    const address = order.delivery_address || {};
    const addressText = [
        address.flatHouseNumber,
        address.floor,
        address.street,
        address.area,
        address.landmark,
        address.city,
        address.state,
        address.pincode,
        address.country
    ].filter(Boolean).join(", ");
    const customer = order.userId || {};
    const itemRows = (Array.isArray(order.itemList) ? order.itemList : []).map((item) => {
        const product = item.productId || {};
        return `<tr><td>${escapeHtml(product.name || "Product")}</td><td>${escapeHtml(formatOrderItemQuantity(item))}</td><td>${formatCurrency(getLineTotal(item))}</td></tr>`;
    }).join("");
    const productTotal = (Array.isArray(order.itemList) ? order.itemList : []).reduce((sum, item) => sum + getLineTotal(item), 0);
    const subtotal = Number(order.subTotalAmt) || productTotal;
    const discount = Math.max(0, subtotal - productTotal);
    const paymentStatus = getOrderPaymentStatus(order);
    const placedAt = order.createdAt ? new Date(order.createdAt).toLocaleString() : "Not available";

    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>PurainaMarket ${escapeHtml(order.orderId || "Order Receipt")}</title><style>
        @page{size:auto;margin:14mm}*{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#17231b;margin:0}main{max-width:720px;margin:0 auto}.brand{width:210px;height:auto;display:block;margin:0 auto 18px}.top{text-align:center;border-bottom:2px solid #185c35;padding-bottom:15px}.muted{color:#58675e}.section{padding:16px 0;border-bottom:1px solid #dce3dd}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.label{font-size:11px;text-transform:uppercase;color:#64736a;margin-bottom:4px}.value{font-weight:600;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;padding:9px 5px;border-bottom:1px solid #e4e9e5;vertical-align:top}th{font-size:11px;color:#64736a;text-transform:uppercase}.money{width:125px;text-align:right;white-space:nowrap}.totals{max-width:340px;margin:12px 0 0 auto}.row{display:flex;justify-content:space-between;gap:14px;padding:5px 0}.grand{font-weight:700;font-size:17px;border-top:1px solid #9eaaa1;margin-top:7px;padding-top:12px}.footer{text-align:center;padding-top:18px;font-size:11px;color:#64736a}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body><main><header class="top"><img class="brand" src="${window.location.origin}/purainamarket-logo.png" alt="PurainaMarket"><div class="muted">Order receipt</div><h1>${escapeHtml(order.orderId || "Order")}</h1><div class="muted">${escapeHtml(placedAt)}</div></header>
    <section class="section grid"><div><div class="label">Customer</div><div class="value">${escapeHtml(customer.name || address.name || "Not provided")}</div></div><div><div class="label">Phone</div><div class="value">${escapeHtml(customer.mobile || address.mobileNumber || "Not provided")}</div></div><div style="grid-column:1/-1"><div class="label">Delivery address</div><div class="value">${escapeHtml(addressText || "Not provided")}</div></div></section>
    <section class="section"><div class="label">Items</div><table><thead><tr><th>Product</th><th>Quantity / weight</th><th class="money">Line total</th></tr></thead><tbody>${itemRows}</tbody></table><div class="totals"><div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div><div class="row"><span>Discount</span><span>−${formatCurrency(discount)}</span></div><div class="row"><span>Delivery / additional charges</span><span>${formatCurrency(order.otherCharge)}</span></div><div class="row grand"><span>Total</span><span>${formatCurrency(order.totalAmt)}</span></div></div></section>
        <section class="section grid"><div><div class="label">Payment method</div><div class="value">${escapeHtml(getOrderPaymentMethod(order))}</div></div><div><div class="label">Payment status</div><div class="value">${escapeHtml(paymentStatus)}</div></div><div><div class="label">Order status</div><div class="value">${escapeHtml(order.order_status || "Not available")}</div></div><div><div class="label">Rider</div><div class="value">${escapeHtml(order.riderId?.name || "Not assigned")}</div></div></section><footer class="footer">Thank you for shopping with PurainaMarket.</footer></main><script>window.addEventListener('load',()=>window.print());</script></body></html>`);
    printWindow.document.close();
    return true;
};

export const getOrderPaymentMethod = (order) => {
    if (order?.paymentId && order?.payment_type === "Cash on Delivery") return "Online payment";
    return order?.payment_type || "Payment method unavailable";
};
