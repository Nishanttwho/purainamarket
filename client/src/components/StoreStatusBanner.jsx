import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useStoreAvailability } from "../provider/StoreAvailabilityContext";

function StoreStatusBanner({ hidden = false }) { // eslint-disable-line react/prop-types
    const { availability, refreshAvailability } = useStoreAvailability();
    if (hidden) return null;
    const isOpen = availability?.isOpen === true;
    const message = availability?.message || "Checking store availability…";
    return (
        <div className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${isOpen ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`} role="status">
            <span className="flex min-w-0 items-center gap-2"><span className="shrink-0">{isOpen ? <CheckCircle2 size={17}/> : <AlertCircle size={17}/>}</span><strong className="shrink-0">{isOpen ? "Ordering open" : availability ? "Ordering paused" : "Store status"}</strong><span className="truncate">{message}</span></span>
            {!isOpen && <button type="button" onClick={refreshAvailability} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 text-xs font-semibold"><RefreshCw size={14}/> Refresh</button>}
        </div>
    );
}

export default StoreStatusBanner;
