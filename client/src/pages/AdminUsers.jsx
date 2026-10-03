import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Eye, Search, ShieldCheck, Trash2, UserRound, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

const money = (value) => `₹${(Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await Axios(summaryApi.getAdminUsers({ search: search.trim(), status: statusFilter, page, limit: 25 }));
            if (!response.data?.success) throw new Error(response.data?.message || "Could not load customers.");
            setUsers(response.data.data.users || []);
            setTotal(response.data.data.total || 0);
            setPages(Math.max(1, response.data.data.pages || 1));
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Could not load customers.");
        } finally { setLoading(false); }
    }, [search, statusFilter, page]);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const showDetails = async (user) => {
        setDetailsLoading(true);
        setSelected({ user, orders: [], coupons: [], redemptions: [], referrals: [] });
        try {
            const response = await Axios(summaryApi.getAdminUser(user._id));
            if (!response.data?.success) throw new Error(response.data?.message || "Could not load customer details.");
            setSelected(response.data.data);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Could not load customer details.");
            setSelected(null);
        } finally { setDetailsLoading(false); }
    };

    const changeStatus = async (user, status) => {
        try {
            const response = await Axios({ ...summaryApi.updateAdminUserStatus(user._id), data: { status } });
            if (!response.data?.success) throw new Error(response.data?.message || "Could not update account status.");
            toast.success(response.data.message || "Account status updated.");
            await loadUsers();
            if (selected?.user?._id === user._id) setSelected((current) => ({ ...current, user: response.data.data }));
        } catch (error) { toast.error(error.response?.data?.message || error.message || "Could not update account status."); }
    };

    const deleteUser = async (user) => {
        if (!window.confirm(`Delete customer account for ${user.name}? Order and referral history will be retained.`)) return;
        try {
            const response = await Axios(summaryApi.deleteAdminUser(user._id));
            if (!response.data?.success) throw new Error(response.data?.message || "Could not delete customer.");
            toast.success(response.data.message || "Customer deleted.");
            if (selected?.user?._id === user._id) setSelected(null);
            await loadUsers();
        } catch (error) { toast.error(error.response?.data?.message || error.message || "Could not delete customer."); }
    };

    return <section className="admin-managed-page admin-users-page space-y-4">
        <header className="admin-management-heading"><div><p>Customer accounts</p><h2>Users</h2><span>Search customer accounts, review activity, and manage account status.</span></div><span className="admin-coupon-count"><Users size={15} /> {total} customers</span></header>
        <div className="admin-filter-toolbar admin-users-filters">
            <label className="admin-search-field"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, or phone" aria-label="Search customers" /></label>
            <label className="admin-filter-field"><span>Account status</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Suspended">Suspended</option></select></label>
        </div>
        {loading ? <div className="admin-loading-state">Loading customers…</div> : users.length ? <div className="admin-users-list">
            {users.map((user) => <article className="admin-user-row" key={user._id}>
                <div className="admin-user-identity"><span className="admin-user-avatar"><UserRound size={19} /></span><div><strong>{user.name || "Unnamed customer"}</strong><span>{user.email}</span></div></div>
                <div className="admin-user-contact"><span>{user.mobile || "No phone"}</span><small><CalendarDays size={13} /> Joined {date(user.createdAt)}</small></div>
                <span className={`admin-coupon-status ${user.status === "Active" ? "is-active" : "is-inactive"}`}>{user.status || "Active"}</span>
                <div className="admin-user-actions"><button type="button" className="admin-secondary-action" onClick={() => showDetails(user)}><Eye size={15} /> Details</button><select aria-label={`Change ${user.name} account status`} value={user.status || "Active"} onChange={(event) => changeStatus(user, event.target.value)}><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Suspended">Suspended</option></select><button type="button" className="admin-user-delete" aria-label={`Delete ${user.name}`} onClick={() => deleteUser(user)}><Trash2 size={16} /></button></div>
            </article>)}
            {pages > 1 && <nav className="admin-pagination" aria-label="Customer pages"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}
        </div> : <div className="admin-empty-state">No customer accounts match this search.</div>}

        {selected && <div className="admin-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
            <section className="admin-user-detail-modal" role="dialog" aria-modal="true" aria-labelledby="admin-user-detail-title">
                <header><div><p>Customer profile</p><h2 id="admin-user-detail-title">{selected.user.name}</h2><span>{selected.user.email} · {selected.user.mobile || "No phone"}</span></div><button type="button" aria-label="Close customer details" onClick={() => setSelected(null)}><X size={19} /></button></header>
                {detailsLoading ? <div className="admin-loading-state">Loading account activity…</div> : <div className="admin-user-detail-content">
                    <div className="admin-user-summary"><span><CalendarDays size={15} /> Registered {date(selected.user.createdAt)}</span><span><ShieldCheck size={15} /> {selected.user.status || "Active"}</span><span>Email verified: {selected.user.verify_email ? "Yes" : "No"}</span></div>
                    <section><h3>Order history <small>{selected.orders?.length || 0}</small></h3>{selected.orders?.length ? <div className="admin-user-history">{selected.orders.map((order) => <article key={order._id}><div><strong>#{order.orderId}</strong><span>{date(order.createdAt)} · {order.order_status}</span></div><strong>{money(order.totalAmt)}</strong><small>{order.itemList?.map((item) => `${item.productId?.name || "Item"} × ${item.quantity}`).join(", ") || "Order items"}</small></article>)}</div> : <p className="admin-user-muted">No orders yet.</p>}</section>
                    <section><h3>Coupons & rewards <small>{selected.coupons?.length || 0}</small></h3>{selected.coupons?.length ? <div className="admin-user-history">{selected.coupons.map((coupon) => <article key={coupon._id}><div><strong>{coupon.code}</strong><span>{coupon.rewardReason || (coupon.isReferralReward ? "Referral Reward" : "Coupon")}</span></div><span className={`admin-coupon-status ${coupon.status === "Available" ? "is-active" : "is-inactive"}`}>{coupon.status}</span><small>{coupon.discountType === "percentage" ? `${coupon.discountValue}% off` : `${money(coupon.discountValue)} off`} · Minimum {money(coupon.minimumOrderValue)} · Expires {date(coupon.expiresAt)}</small></article>)}</div> : <p className="admin-user-muted">No customer-specific coupons.</p>}</section>
                    <section><h3>Referral activity <small>{selected.referrals?.length || 0}</small></h3>{selected.referrals?.length ? <div className="admin-user-history">{selected.referrals.map((referral) => <article key={referral._id}><div><strong>{referral.inviterId?._id === selected.user._id ? `Invited ${referral.referredUserId?.name || "customer"}` : `Invited by ${referral.inviterId?.name || "customer"}`}</strong><span>{referral.status} · {date(referral.createdAt)}</span></div><strong>{referral.rewardCouponId?.code || "Reward pending"}</strong><small>{referral.qualifyingOrderId ? `Qualifying order ${referral.qualifyingOrderId.orderId} · ${referral.qualifyingOrderId.order_status}` : referral.latestOrderId ? `Latest order ${referral.latestOrderId.orderId} · ${referral.latestOrderId.order_status}` : "No qualifying order yet"}</small></article>)}</div> : <p className="admin-user-muted">No referral activity.</p>}</section>
                    {selected.redemptions?.length > 0 && <section><h3>Coupon redemption history <small>{selected.redemptions.length}</small></h3><div className="admin-user-history">{selected.redemptions.map((row) => <article key={row._id}><div><strong>{row.code}</strong><span>{row.status} · {date(row.createdAt)}</span></div><strong>{money(row.discountAmount)}</strong><small>Order {row.orderId}</small></article>)}</div></section>}
                    <footer><button type="button" className="admin-user-delete-text" onClick={() => deleteUser(selected.user)}><Trash2 size={15} /> Delete customer account</button><button type="button" className="admin-secondary-action" onClick={() => setSelected(null)}>Close</button></footer>
                </div>}
            </section>
        </div>}
    </section>;
}

export default AdminUsers;
