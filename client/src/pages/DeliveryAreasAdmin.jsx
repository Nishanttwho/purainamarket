import { useEffect, useState } from "react";
import { Plus, Save, Truck } from "lucide-react";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import toast from "react-hot-toast";

const emptyArea = { name: "", deliveryFee: "", estimatedDeliveryMinutes: "", freeDeliveryMinimumOrderValue: "", isEnabled: true };

function DeliveryAreasAdmin() {
    const [areas, setAreas] = useState([]);
    const [newArea, setNewArea] = useState(emptyArea);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const fetchAreas = async () => {
        try {
            setLoading(true);
            const response = await Axios(summaryApi.getDeliveryAreas);
            if (response.data?.success !== true) throw new Error(response.data?.message || "Could not load delivery areas.");
            setAreas((response.data.data || []).map((area) => ({ ...area, freeDeliveryMinimumOrderValue: area.freeDeliveryMinimumOrderValue ?? "" })));
            setError("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.message || "Could not load delivery areas.");
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchAreas(); }, []);

    const save = async (area, isNew) => {
        try {
            setSaving(true);
            const payload = { ...area, deliveryFee: Number(area.deliveryFee), estimatedDeliveryMinutes: Number(area.estimatedDeliveryMinutes), freeDeliveryMinimumOrderValue: area.freeDeliveryMinimumOrderValue === "" ? null : Number(area.freeDeliveryMinimumOrderValue) };
            const response = isNew
                ? await Axios({ ...summaryApi.createDeliveryArea, data: payload })
                : await Axios({ ...summaryApi.updateDeliveryArea(area._id), data: payload });
            if (response.data?.success !== true) throw new Error(response.data?.message || "Could not save delivery area.");
            toast.success(isNew ? "Delivery area added." : "Delivery area updated.");
            if (isNew) setNewArea(emptyArea);
            await fetchAreas();
        } catch (requestError) {
            toast.error(requestError.response?.data?.message || requestError.message || "Could not save delivery area.");
        } finally { setSaving(false); }
    };

    const updateArea = (id, key, value) => setAreas((current) => current.map((area) => area._id === id ? { ...area, [key]: value } : area));
    const field = (label, key, value, onChange, { type = "number", min = "0", step = "1" } = {}) => (
        <label className="admin-form-field">{label}<input type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} required={key !== "freeDeliveryMinimumOrderValue"} /></label>
    );

    return <section className="admin-managed-page admin-coupon-page">
        <header className="admin-management-heading"><div><p>Delivery</p><h2>Delivery areas</h2><span>Set each area&apos;s fee, delivery estimate, and free-delivery minimum.</span></div></header>
        <form className="admin-coupon-form" onSubmit={(event) => { event.preventDefault(); save(newArea, true); }}>
            <h3 className="font-bold">Add delivery area</h3>
            <div className="admin-coupon-form-grid">
                {field("Area name", "name", newArea.name, (value) => setNewArea({ ...newArea, name: value }), { type: "text" })}
                {field("Delivery fee (₹)", "deliveryFee", newArea.deliveryFee, (value) => setNewArea({ ...newArea, deliveryFee: value }), { step: "0.01" })}
                {field("Estimated delivery (minutes)", "estimatedDeliveryMinutes", newArea.estimatedDeliveryMinutes, (value) => setNewArea({ ...newArea, estimatedDeliveryMinutes: value }))}
                {field("Free delivery above (₹, optional)", "freeDeliveryMinimumOrderValue", newArea.freeDeliveryMinimumOrderValue, (value) => setNewArea({ ...newArea, freeDeliveryMinimumOrderValue: value }), { step: "0.01" })}
            </div>
            <button className="admin-primary-action w-fit" disabled={saving}><Plus size={16} /> Add area</button>
        </form>
        <div className="admin-coupon-list">
            <h3 className="font-bold">Configured areas</h3>
            {loading ? <p>Loading delivery areas…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : !areas.length ? <p>No delivery areas configured yet.</p> : areas.map((area) => <form key={area._id} className="admin-coupon-form" onSubmit={(event) => { event.preventDefault(); save(area, false); }}>
                <div className="flex items-center gap-2 font-bold"><Truck size={17} />{area.name}</div>
                <div className="admin-coupon-form-grid">
                    {field("Area name", "name", area.name, (value) => updateArea(area._id, "name", value), { type: "text" })}
                    {field("Delivery fee (₹)", "deliveryFee", area.deliveryFee, (value) => updateArea(area._id, "deliveryFee", value), { step: "0.01" })}
                    {field("Estimated delivery (minutes)", "estimatedDeliveryMinutes", area.estimatedDeliveryMinutes, (value) => updateArea(area._id, "estimatedDeliveryMinutes", value))}
                    {field("Free delivery above (₹, optional)", "freeDeliveryMinimumOrderValue", area.freeDeliveryMinimumOrderValue, (value) => updateArea(area._id, "freeDeliveryMinimumOrderValue", value), { step: "0.01" })}
                </div>
                <label className="flex min-h-10 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(area.isEnabled)} onChange={(event) => updateArea(area._id, "isEnabled", event.target.checked)} />Enabled for delivery</label>
                <button className="admin-secondary-action w-fit" disabled={saving}><Save size={16} /> Save changes</button>
            </form>)}
        </div>
    </section>;
}

export default DeliveryAreasAdmin;
