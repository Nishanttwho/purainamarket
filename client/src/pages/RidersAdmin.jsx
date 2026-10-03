import { useCallback, useEffect, useState } from "react";
import { UserRoundPlus } from "lucide-react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";

function RidersAdmin() {
    const [riders, setRiders] = useState([]);
    const [form, setForm] = useState({ name: "", email: "", mobile: "", password: "" });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const loadRiders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await Axios(summaryApi.getAdminRiders);
            if (response.data?.success !== true || !Array.isArray(response.data.data)) throw new Error(response.data?.message || "Could not load riders.");
            setRiders(response.data.data);
            setError("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.message || "Could not load riders.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRiders(); }, [loadRiders]);

    const submit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        try {
            const response = await Axios({ ...summaryApi.createAdminRider, data: form });
            if (response.data?.success !== true || !response.data.data) throw new Error(response.data?.message || "Could not create rider account.");
            toast.success(response.data.message || "Rider account created.");
            setForm({ name: "", email: "", mobile: "", password: "" });
            await loadRiders();
        } catch (requestError) {
            toast.error(requestError.response?.data?.message || requestError.message || "Could not create rider account.");
        } finally {
            setSubmitting(false);
        }
    };

    const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

    return (
        <section className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
            <div><p className="text-sm font-semibold text-emerald-800">Team</p><h1 className="mt-1 text-2xl font-bold">Rider accounts</h1><p className="mt-1 text-sm text-slate-600">Create delivery logins. New customer orders go directly to the rider queue.</p></div>
            <form onSubmit={submit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-5">
                <label className="grid gap-1 text-sm font-semibold">Full name<input required autoComplete="name" value={form.name} onChange={update("name")} className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1 text-sm font-semibold">Email<input required type="email" autoComplete="email" value={form.email} onChange={update("email")} className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1 text-sm font-semibold">Mobile number<input required type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel" value={form.mobile} onChange={update("mobile")} className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" /></label>
                <label className="grid gap-1 text-sm font-semibold">Temporary password<input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={update("password")} className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal" /></label>
                <button disabled={submitting} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 font-bold text-white disabled:opacity-60 sm:col-span-2"><UserRoundPlus size={18} />{submitting ? "Creating…" : "Create rider account"}</button>
            </form>
            <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Riders</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">{riders.length}</span></div>{error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}<button onClick={loadRiders} className="ml-2 font-bold underline">Retry</button></div>}{loading ? <p className="rounded-lg bg-white p-5 text-sm text-slate-500">Loading rider accounts…</p> : riders.length ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{riders.map((rider) => <div key={rider._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0"><div><p className="font-semibold">{rider.name}</p><p className="text-sm text-slate-600">{rider.email} · {rider.mobile}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${rider.status === "Active" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-600"}`}>{rider.status}</span></div>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No rider accounts yet.</div>}</section>
        </section>
    );
}

export default RidersAdmin;