/* eslint-disable react/prop-types */
function SellingTypeFields({ data, setData }) {
    const config = data.looseConfig || { presetWeightsKg: [0.25, 0.5, 1, 2, 5], presetAmounts: [10, 50, 100], allowCustomWeight: true, allowAmount: true };
    const updateConfig = (key, value) => setData(prev => ({ ...prev, looseConfig: { ...config, [key]: value } }));
    return <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Selling Type</label><select value={data.sellingType || "packed"} onChange={(e) => setData(prev => ({ ...prev, sellingType: e.target.value }))} className="w-full rounded border border-gray-300 p-2"><option value="packed">Packed Product</option><option value="loose">Loose / Open Product</option></select></div>
        {data.sellingType === "loose" && <>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Price per kg (₹)</label><input type="number" min="0" value={data.pricePerKg || ""} onChange={(e) => setData(prev => ({ ...prev, pricePerKg: e.target.value, price: e.target.value }))} className="w-full rounded border border-gray-300 p-2" placeholder="e.g. 400" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Preset weights (kg, comma separated)</label><input value={(config.presetWeightsKg || []).join(", ")} onChange={(e) => updateConfig("presetWeightsKg", e.target.value.split(",").map(Number).filter(value => value > 0))} className="w-full rounded border border-gray-300 p-2" placeholder="0.25, 0.5, 1, 2, 5" /></div>
            <div className="flex flex-wrap gap-4 text-sm"><label><input type="checkbox" checked={config.allowCustomWeight !== false} onChange={(e) => updateConfig("allowCustomWeight", e.target.checked)} className="mr-1" />Custom weight</label><label><input type="checkbox" checked={config.allowAmount !== false} onChange={(e) => updateConfig("allowAmount", e.target.checked)} className="mr-1" />Purchase by ₹ amount</label></div>
            {config.allowAmount !== false && <div><label className="block text-sm font-medium text-gray-700 mb-1">Suggested amounts (₹, comma separated)</label><input value={(config.presetAmounts || []).join(", ")} onChange={(e) => updateConfig("presetAmounts", e.target.value.split(",").map(Number).filter(value => value > 0))} className="w-full rounded border border-gray-300 p-2" placeholder="10, 50, 100" /></div>}
        </>}
    </div>;
}
export default SellingTypeFields;
