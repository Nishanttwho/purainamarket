import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

const emptyForm = () => ({
    code: "",
    discountType: "percentage",
    discountValue: "",
    minimumOrderValue: "0",
    maximumDiscount: "",
    startsAt: "",
    expiresAt: "",
    isActive: true,
    usageLimit: "",
    oneTimeUse: true,
    perUserUsageLimit: "1",
    applicableUsers: [],
    isReferralRewardTemplate: false,
    rewardReason: "",
    referralMinimumOrderValue: "0",
    rewardValidityDays: "30"
});

const dateValue = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const currency = (value) => `₹${(Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function CouponsAdmin() {
    const [coupons, setCoupons] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [eligibleSearch, setEligibleSearch] = useState("");
    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [usageCoupon, setUsageCoupon] = useState(null);
    const [usageRows, setUsageRows] = useState([]);

    const loadCoupons = async () => {
        setLoading(true);
        try {
            const response = await Axios(summaryApi.getAdminCoupons);
            if (response.data?.success !== true || !Array.isArray(response.data.data)) throw new Error(response.data?.message || "Could not load coupons.");
            setCoupons(response.data.data);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Could not load coupons.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadCoupons(); }, []);

    useEffect(() => {
        const query = eligibleSearch.trim();
        if (query.length < 2) {
            setEligibleUsers([]);
            return undefined;
        }
        let active = true;
        const timeout = setTimeout(async () => {
            try {
                const response = await Axios(summaryApi.searchCouponUsers(query));
                if (active && response.data?.success) setEligibleUsers(response.data.data || []);
            } catch {
                if (active) setEligibleUsers([]);
            }
        }, 220);
        return () => { active = false; clearTimeout(timeout); };
    }, [eligibleSearch]);

    const change = (field) => (event) => {
        const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
        setForm((current) => ({
            ...current,
            [field]: value,
            ...(field === "oneTimeUse" && value ? { perUserUsageLimit: "1" } : {})
        }));
    };

    const startEdit = (coupon) => {
        setEditingId(coupon._id);
        setForm({
            code: coupon.code || "",
            discountType: coupon.discountType || "percentage",
            discountValue: String(coupon.discountValue ?? ""),
            minimumOrderValue: String(coupon.minimumOrderValue ?? 0),
            maximumDiscount: coupon.maximumDiscount == null ? "" : String(coupon.maximumDiscount),
            startsAt: dateValue(coupon.startsAt),
            expiresAt: dateValue(coupon.expiresAt),
            isActive: coupon.isActive === true,
            usageLimit: coupon.usageLimit == null ? "" : String(coupon.usageLimit),
            oneTimeUse: coupon.oneTimeUse !== false,
            perUserUsageLimit: String(coupon.perUserUsageLimit ?? 1),
            applicableUsers: coupon.applicableUsers || [],
            isReferralRewardTemplate: coupon.isReferralRewardTemplate === true,
            rewardReason: coupon.rewardReason || "",
            referralMinimumOrderValue: String(coupon.referralMinimumOrderValue ?? 0),
            rewardValidityDays: String(coupon.rewardValidityDays ?? 30)
        });
        setEligibleSearch("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const resetForm = () => {
        setEditingId("");
        setForm(emptyForm());
        setEligibleSearch("");
        setEligibleUsers([]);
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        const payload = {
            ...form,
            startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
            expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
            applicableUsers: form.applicableUsers.map((user) => user._id || user),
            perUserUsageLimit: form.oneTimeUse ? 1 : Number(form.perUserUsageLimit),
            discountValue: Number(form.discountValue),
            minimumOrderValue: Number(form.minimumOrderValue || 0),
            maximumDiscount: form.maximumDiscount === "" ? null : Number(form.maximumDiscount),
            usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
            referralMinimumOrderValue: Number(form.referralMinimumOrderValue || 0),
            rewardValidityDays: Number(form.rewardValidityDays || 30)
        };
        try {
            const request = editingId
                ? Axios({ ...summaryApi.updateAdminCoupon(editingId), data: payload })
                : Axios({ ...summaryApi.createAdminCoupon, data: payload });
            const response = await request;
            if (response.data?.success !== true) throw new Error(response.data?.message || "Could not save coupon.");
            toast.success(response.data.message || "Coupon saved.");
            resetForm();
            await loadCoupons();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Could not save coupon.");
        } finally {
            setSaving(false);
        }
    };

    const deactivate = async (coupon) => {
        if (!window.confirm(`Deactivate ${coupon.code}? Existing order history will be retained.`)) return;
        try {
            const response = await Axios(summaryApi.disableAdminCoupon(coupon._id));
            if (response.data?.success !== true) throw new Error(response.data?.message || "Could not deactivate coupon.");
            toast.success(response.data.message || "Coupon deactivated.");
            await loadCoupons();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Could not deactivate coupon.");
        }
    };

    const showUsage = async (coupon) => {
        try {
            const response = await Axios(summaryApi.getAdminCouponUsage(coupon._id));
            if (response.data?.success !== true) throw new Error(response.data?.message || "Could not load usage history.");
            setUsageCoupon(coupon);
            setUsageRows(response.data.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Could not load usage history.");
        }
    };

    const addEligibleUser = (user) => {
        if (form.applicableUsers.some((selected) => (selected._id || selected).toString() === user._id)) return;
        setForm((current) => ({ ...current, applicableUsers: [...current.applicableUsers, user] }));
        setEligibleSearch("");
        setEligibleUsers([]);
    };

    const filteredCoupons = coupons.filter((coupon) => `${coupon.code} ${coupon.discountType}`.toLowerCase().includes(search.trim().toLowerCase()));
    const fieldClass = "admin-form-field";

    return (
        <section className="admin-managed-page admin-coupon-page">
            <header className="admin-management-heading">
                <div><p>Promotions</p><h2>Coupons</h2><span>Create store discounts and configure the referral reward offer.</span></div>
                <span className="admin-coupon-count">{coupons.length} coupons</span>
            </header>

            <form className="admin-coupon-form" onSubmit={submit}>
                <div className="admin-form-section-heading"><div><h2>{editingId ? "Edit coupon" : "Create a coupon"}</h2><p>Customers can apply active coupons in their cart. Checkout validates each code on the server.</p></div></div>
                <div className="admin-coupon-form-grid">
                    <label className={fieldClass}><span>Coupon code</span><input required maxLength={64} autoCapitalize="characters" value={form.code} onChange={change("code")} placeholder="For example, FRESH10" /></label>
                    <label className={fieldClass}><span>Customer reason, optional</span><input maxLength={80} value={form.rewardReason} onChange={change("rewardReason")} placeholder="Welcome Offer" /></label>
                    <label className={fieldClass}><span>Discount type</span><select value={form.discountType} onChange={change("discountType")}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
                    <label className={fieldClass}><span>Discount value {form.discountType === "percentage" ? "(%)" : "(₹)"}</span><input required type="number" min="0.01" max={form.discountType === "percentage" ? 100 : undefined} step="0.01" value={form.discountValue} onChange={change("discountValue")} /></label>
                    <label className={fieldClass}><span>Minimum order (₹)</span><input type="number" min="0" step="0.01" value={form.minimumOrderValue} onChange={change("minimumOrderValue")} /></label>
                    <label className={fieldClass}><span>Maximum discount (₹), optional</span><input type="number" min="0.01" step="0.01" value={form.maximumDiscount} onChange={change("maximumDiscount")} /></label>
                    <label className={fieldClass}><span>Total uses, optional</span><input type="number" min="1" step="1" value={form.usageLimit} onChange={change("usageLimit")} placeholder="No limit" /></label>
                    <label className={fieldClass}><span>Starts</span><input required type="datetime-local" value={form.startsAt} onChange={change("startsAt")} /></label>
                    <label className={fieldClass}><span>Expires, optional</span><input type="datetime-local" value={form.expiresAt} onChange={change("expiresAt")} /></label>
                </div>

                <div className="admin-coupon-option-row">
                    <label><input type="checkbox" checked={form.isActive} onChange={change("isActive")} /> Active</label>
                    <label><input type="checkbox" checked={form.oneTimeUse} onChange={change("oneTimeUse")} /> One use per customer</label>
                    {!form.oneTimeUse && <label className="admin-coupon-limit-field"><span>Uses per customer</span><input type="number" min="1" step="1" value={form.perUserUsageLimit} onChange={change("perUserUsageLimit")} /></label>}
                </div>

                <section className="admin-coupon-eligibility">
                    <div><h3>Who can use it?</h3><p>Leave the list empty for all customers, or select specific accounts.</p></div>
                    <label className="admin-search-field"><Search size={17} /><span className="sr-only">Search eligible customers</span><input value={eligibleSearch} onChange={(event) => setEligibleSearch(event.target.value)} placeholder="Search customer name or email" /></label>
                    {eligibleUsers.length > 0 && <div className="admin-coupon-user-results">{eligibleUsers.map((user) => <button type="button" key={user._id} onClick={() => addEligibleUser(user)}><Users size={15} /><span>{user.name}</span><small>{user.email}</small><Plus size={16} /></button>)}</div>}
                    {form.applicableUsers.length > 0 && <div className="admin-coupon-selected-users">{form.applicableUsers.map((user) => <button type="button" key={user._id || user} onClick={() => setForm((current) => ({ ...current, applicableUsers: current.applicableUsers.filter((selected) => (selected._id || selected).toString() !== (user._id || user).toString()) }))}>{user.name || user.email || user} <span aria-hidden="true">×</span></button>)}</div>}
                </section>

                <fieldset className="admin-coupon-referral-options">
                    <legend>Referral reward</legend>
                    <label><input type="checkbox" checked={form.isReferralRewardTemplate} onChange={change("isReferralRewardTemplate")} /> Use this coupon as the referral reward template</label>
                    {form.isReferralRewardTemplate && <div className="admin-coupon-form-grid"><label className={fieldClass}><span>Referred customer qualifying order (₹)</span><input type="number" min="0" step="0.01" value={form.referralMinimumOrderValue} onChange={change("referralMinimumOrderValue")} /></label><label className={fieldClass}><span>Reward coupon validity (days)</span><input type="number" min="1" max="365" step="1" value={form.rewardValidityDays} onChange={change("rewardValidityDays")} /></label></div>}
                </fieldset>

                <div className="admin-coupon-form-actions"><button className="admin-primary-action" disabled={saving}><Check size={17} />{saving ? "Saving…" : editingId ? "Save changes" : "Create coupon"}</button>{editingId && <button className="admin-secondary-action" type="button" onClick={resetForm}>Cancel edit</button>}</div>
            </form>

            <section className="admin-coupon-list">
                <header className="admin-coupon-list-header"><div><h2>Coupon list</h2><p>Usage and eligibility are stored with each coupon.</p></div><label className="admin-search-field"><Search size={17} /><span className="sr-only">Search coupons</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search coupon codes" /></label></header>
                {loading ? <p className="admin-loading-state">Loading coupons…</p> : filteredCoupons.length ? <div className="admin-coupon-list-items">{filteredCoupons.map((coupon) => <article key={coupon._id} className="admin-coupon-row">
                    <div className="admin-coupon-row-main"><span className={`admin-coupon-status ${coupon.isActive ? "is-active" : "is-inactive"}`}>{coupon.isActive ? "Active" : "Inactive"}</span><strong>{coupon.code}</strong><span>{coupon.discountType === "percentage" ? `${coupon.discountValue}% off` : `${currency(coupon.discountValue)} off`}</span>{coupon.isReferralRewardTemplate && <em>Referral reward</em>}</div>
                    <div className="admin-coupon-row-meta"><span>{coupon.usageCount || 0}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : " uses"}</span><span>{coupon.expiresAt ? `Expires ${new Date(coupon.expiresAt).toLocaleDateString()}` : "No expiry"}</span><span>{coupon.applicableUsers?.length ? `${coupon.applicableUsers.length} selected customers` : "All customers"}</span></div>
                    <div className="admin-coupon-row-actions"><button type="button" title="Usage history" aria-label={`Usage history for ${coupon.code}`} onClick={() => showUsage(coupon)}><Users size={16} /></button><button type="button" title="Edit coupon" aria-label={`Edit ${coupon.code}`} onClick={() => startEdit(coupon)}><Pencil size={16} /></button>{coupon.isActive && <button type="button" title="Deactivate coupon" aria-label={`Deactivate ${coupon.code}`} onClick={() => deactivate(coupon)}><Trash2 size={16} /></button>}</div>
                </article>)}</div> : <div className="admin-empty-state">No coupons match this search.</div>}
            </section>

            {usageCoupon && <div className="admin-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUsageCoupon(null); }}><section className="admin-coupon-usage-modal" role="dialog" aria-modal="true" aria-labelledby="coupon-usage-title"><header><div><h2 id="coupon-usage-title">{usageCoupon.code} usage</h2><p>{usageRows.length} recorded reservations or redemptions</p></div><button type="button" aria-label="Close usage history" onClick={() => setUsageCoupon(null)}>×</button></header>{usageRows.length ? <div className="admin-coupon-usage-list">{usageRows.map((row) => <article key={row._id}><div><strong>{row.userId?.name || "Customer"}</strong><span>{row.userId?.email || row.userId?._id || "Unknown account"}</span></div><div><strong>{row.status}</strong><span>{row.code} · {currency(row.discountAmount)}</span></div><small>Order {row.orderId}</small></article>)}</div> : <p className="admin-empty-state">No coupon uses recorded yet.</p>}</section></div>}
        </section>
    );
}

export default CouponsAdmin;
