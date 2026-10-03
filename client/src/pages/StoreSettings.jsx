import { useEffect, useState } from "react";
import { Plus, Store, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

const blank = { manualIsOpen: true, closedTodayUntil: "", orderingStartsAt: "", orderingEndsAt: "", customMessage: "", schedulePeriods: [] };
const localDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const datePayload = (value) => value ? new Date(value).toISOString() : null;

function StoreSettings() {
    const [settings, setSettings] = useState(blank);
    const [availability, setAvailability] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [a, b] = await Promise.all([Axios(summaryApi.getAdminStoreSettings), Axios(summaryApi.getStoreStatus)]);
            const stored = a.data?.data || {};
            setSettings({ ...blank, ...stored,
                closedTodayUntil: localDateTime(stored.closedTodayUntil),
                orderingStartsAt: localDateTime(stored.orderingStartsAt),
                orderingEndsAt: localDateTime(stored.orderingEndsAt),
                schedulePeriods: (stored.schedulePeriods || []).map((p) => ({ ...p, startsAt: localDateTime(p.startsAt), endsAt: localDateTime(p.endsAt) }))
            });
            setAvailability(b.data?.data || null);
        } catch (error) { toast.error(error.response?.data?.message || "Unable to load store settings."); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const save = async (next = settings) => {
        setSaving(true);
        try {
            const payload = { ...next, closedTodayUntil: datePayload(next.closedTodayUntil), orderingStartsAt: datePayload(next.orderingStartsAt), orderingEndsAt: datePayload(next.orderingEndsAt),
                schedulePeriods: next.schedulePeriods.map((p) => ({ ...p, startsAt: datePayload(p.startsAt), endsAt: datePayload(p.endsAt) }))
            };
            const response = await Axios({ ...summaryApi.updateAdminStoreSettings, data: payload });
            if (!response.data?.success) throw new Error(response.data?.message || "Could not save settings.");
            toast.success(response.data.message || "Store settings saved.");
            await load();
        } catch (error) { toast.error(error.response?.data?.message || error.message || "Could not save settings."); }
        finally { setSaving(false); }
    };
    const update = (field) => (event) => setSettings((current) => ({ ...current, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
    const updatePeriod = (index, field, value) => setSettings((current) => ({ ...current, schedulePeriods: current.schedulePeriods.map((p, i) => i === index ? { ...p, [field]: value } : p) }));
    const addPeriod = () => setSettings((current) => ({ ...current, schedulePeriods: [...current.schedulePeriods, { label: "", startsAt: "", endsAt: "", isOpen: false, message: "" }] }));
    const closeToday = () => {
        const end = new Date(); end.setHours(23, 59, 59, 999);
        const next = { ...settings, closedTodayUntil: localDateTime(end) };
        setSettings(next); save(next);
    };

    return <section className="admin-managed-page space-y-4">
        <header className="admin-management-heading"><div><p>Store operations</p><h2>Ordering settings</h2><span>Availability updates automatically at the times you set.</span></div></header>
        {loading ? <div className="admin-coupon-form">Loading store settings…</div> : <>
            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Store size={22}/></span><div><h3 className="font-bold text-slate-900">{availability?.isOpen ? "Ordering is open" : "Ordering is closed"}</h3><p className="text-sm text-slate-600">{availability?.message}</p></div></div>
                    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-semibold"><input type="checkbox" checked={settings.manualIsOpen} onChange={update("manualIsOpen")} /> Manual store open</label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={closeToday} disabled={saving} className="admin-secondary-action">Close for today</button><button type="button" onClick={() => { const next = { ...settings, closedTodayUntil: "" }; setSettings(next); save(next); }} disabled={saving} className="admin-secondary-action">Clear today closure</button></div>
            </section>
            <form className="admin-coupon-form space-y-4" onSubmit={(event) => { event.preventDefault(); save(); }}>
                <div className="admin-form-section-heading"><div><h2>Ordering period</h2><p>Optional overall start and end limits for accepting orders.</p></div></div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="admin-form-field"><span>Ordering available from</span><input type="datetime-local" value={settings.orderingStartsAt} onChange={update("orderingStartsAt")} /></label>
                    <label className="admin-form-field"><span>Ordering allowed until</span><input type="datetime-local" value={settings.orderingEndsAt} onChange={update("orderingEndsAt")} /></label>
                </div>
                <label className="admin-form-field"><span>Customer message (optional)</span><textarea maxLength={240} rows={2} value={settings.customMessage} onChange={update("customMessage")} placeholder="Orders are accepted from 9:00 AM to 9:00 PM." /></label>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><div><h3 className="font-bold text-slate-900">Scheduled periods</h3><p className="text-sm text-slate-500">Temporary open or closed windows.</p></div><button type="button" onClick={addPeriod} className="admin-secondary-action"><Plus size={16}/> Add period</button></div>
                {settings.schedulePeriods.map((period, index) => <div key={period._id || index} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                    <div className="mb-3 flex items-center justify-between gap-2"><p className="font-semibold text-slate-800">Schedule {index + 1}</p><button type="button" aria-label={"Remove schedule " + (index + 1)} onClick={() => setSettings((current) => ({ ...current, schedulePeriods: current.schedulePeriods.filter((_, i) => i !== index) }))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={17}/></button></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="admin-form-field"><span>Label</span><input value={period.label || ""} onChange={(event) => updatePeriod(index, "label", event.target.value)} placeholder="Launch window" /></label>
                        <label className="admin-form-field"><span>Period status</span><select value={period.isOpen ? "open" : "closed"} onChange={(event) => updatePeriod(index, "isOpen", event.target.value === "open")}><option value="open">Open ordering</option><option value="closed">Close ordering</option></select></label>
                        <label className="admin-form-field"><span>Starts</span><input type="datetime-local" required value={period.startsAt} onChange={(event) => updatePeriod(index, "startsAt", event.target.value)} /></label>
                        <label className="admin-form-field"><span>Ends</span><input type="datetime-local" required value={period.endsAt} onChange={(event) => updatePeriod(index, "endsAt", event.target.value)} /></label>
                        <label className="admin-form-field sm:col-span-2"><span>Customer message (optional)</span><input maxLength={240} value={period.message || ""} onChange={(event) => updatePeriod(index, "message", event.target.value)} /></label>
                    </div>
                </div>)}
                <div className="admin-coupon-form-actions"><button className="admin-primary-action" disabled={saving}>{saving ? "Saving…" : "Save ordering settings"}</button></div>
            </form>
        </>}
    </section>;
}

export default StoreSettings;
