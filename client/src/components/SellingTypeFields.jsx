/* eslint-disable react/prop-types */
function SellingTypeFields({ data, setData }) {
    const config = data.looseConfig || { presetWeightsKg: [0.25, 0.5, 1, 2, 5], presetAmounts: [10, 50, 100], allowCustomWeight: true, allowAmount: true };
    const updateConfig = (key, value) => setData((prev) => ({ ...prev, looseConfig: { ...config, [key]: value } }));

    return (
        <section className="admin-selling-config">
            <div className="admin-form-section-heading">
                <div>
                    <h2>How customers buy this product</h2>
                    <p>Choose a packed unit or configure loose and open purchases.</p>
                </div>
            </div>
            <label className="admin-form-field">
                <span>Selling type</span>
                <select value={data.sellingType || "packed"} onChange={(event) => setData((prev) => ({
                    ...prev,
                    sellingType: event.target.value,
                    ...(event.target.value === "loose" ? { unit: "1 kg", priceUnitGrams: prev.priceUnitGrams || 1000 } : {}),
                }))}>
                    <option value="packed">Packed product</option>
                    <option value="loose">Loose / open product</option>
                </select>
            </label>
            {data.sellingType === "loose" && (
                <div className="admin-loose-config">
                    <p className="admin-form-help">Set the price for the selected selling unit. Weight choices and rupee purchases are converted from this price.</p>
                    <label className="admin-form-field">
                        <span>Pricing unit</span>
                        <select value={data.priceUnitGrams || 1000} onChange={(event) => {
                            const unitGrams = Number(event.target.value);
                            setData((prev) => ({ ...prev, priceUnitGrams: unitGrams, unit: unitGrams === 1000 ? "1 kg" : `${unitGrams} g` }));
                        }}>
                            <option value={100}>100 g</option>
                            <option value={250}>250 g</option>
                            <option value={500}>500 g</option>
                            <option value={1000}>1 kg</option>
                        </select>
                    </label>
                    <label className="admin-form-field">
                        <span>Price for {Number(data.priceUnitGrams || 1000) === 1000 ? "1 kg" : `${data.priceUnitGrams || 1000} g`} (₹)</span>
                        <input type="number" min="0" step="0.01" value={data.price || ""} onChange={(event) => setData((prev) => ({ ...prev, price: event.target.value, pricePerKg: Number(event.target.value) * 1000 / Number(prev.priceUnitGrams || 1000) }))} placeholder="Enter price for this unit" />
                    </label>
                    <label className="admin-form-field">
                        <span>Preset weights (kg)</span>
                        <small>Enter comma-separated choices shown to customers.</small>
                        <input value={(config.presetWeightsKg || []).join(", ")} onChange={(event) => updateConfig("presetWeightsKg", event.target.value.split(",").map(Number).filter((value) => value > 0))} placeholder="0.25, 0.5, 1, 2, 5" />
                    </label>
                    <fieldset className="admin-purchase-options">
                        <legend>Customer purchase options</legend>
                        <label><input type="checkbox" checked={config.allowCustomWeight !== false} onChange={(event) => updateConfig("allowCustomWeight", event.target.checked)} /> Allow a custom weight</label>
                        <label><input type="checkbox" checked={config.allowAmount !== false} onChange={(event) => updateConfig("allowAmount", event.target.checked)} /> Allow purchase by rupee amount</label>
                    </fieldset>
                    {config.allowAmount !== false && (
                        <label className="admin-form-field">
                            <span>Suggested amounts (₹)</span>
                            <small>Enter comma-separated quick choices.</small>
                            <input value={(config.presetAmounts || []).join(", ")} onChange={(event) => updateConfig("presetAmounts", event.target.value.split(",").map(Number).filter((value) => value > 0))} placeholder="10, 50, 100" />
                        </label>
                    )}
                </div>
            )}
        </section>
    );
}

export default SellingTypeFields;
