/* eslint-disable react/prop-types */
import { useState } from "react";
import { userCart } from "../provider/CartContext";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Minus, Plus } from "lucide-react";

function AddToCartButton({ data }) {
    const { addCartItem, updateCartItem, deleteCartItem } = userCart();
    const cartItem = useSelector(state => state.cartItem.cart);
    const isLoose = data?.sellingType === "loose";
    const config = data?.looseConfig || {};
    const [chooserOpen, setChooserOpen] = useState(false);
    const [mode, setMode] = useState("weight");
    const [value, setValue] = useState("");

    const cartItemDetails = !isLoose && cartItem.find(item => String(item.productId?._id || item.productId) === String(data?._id) && item.sellingType !== "loose");
    const addItem = async (payload = {}) => {
        const result = await addCartItem(data, payload);
        if (result) { setChooserOpen(false); setValue(""); }
    };
    const chooseLoose = (e) => {
        e.preventDefault(); e.stopPropagation();
        const selected = Number(value);
        if (!selected || selected <= 0) return toast.error(mode === "amount" ? "Enter a valid amount." : "Choose or enter a valid weight.");
        addItem(mode === "amount" ? { purchaseMode: "amount", amount: selected } : { purchaseMode: "weight", selectedWeightKg: selected });
    };

    if (isLoose) return <div className="relative" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <button disabled={data?.stock === 0} onClick={() => setChooserOpen(!chooserOpen)} className={`rounded-lg border-2 px-3 py-1.5 text-xs font-extrabold tracking-wide transition ${data?.stock === 0 ? "border-gray-400 text-gray-400" : "border-[#318616] text-[#318616] hover:bg-[#318616] hover:text-white"}`}>ADD</button>
        {chooserOpen && <div className="absolute right-0 bottom-full z-30 mb-2 w-64 rounded-xl border border-emerald-100 bg-white p-3 text-left shadow-xl">
            <p className="text-xs font-semibold text-gray-700 mb-2">Choose how much</p>
            <div className="flex gap-1 mb-2"><button onClick={() => { setMode("weight"); setValue(""); }} className={`text-xs px-2 py-1 rounded ${mode === "weight" ? "bg-[#0C831F] text-white" : "bg-gray-100"}`}>By weight</button>{config.allowAmount !== false && <button onClick={() => { setMode("amount"); setValue(""); }} className={`text-xs px-2 py-1 rounded ${mode === "amount" ? "bg-[#0C831F] text-white" : "bg-gray-100"}`}>By ₹ amount</button>}</div>
            {mode === "weight" && <div className="flex flex-wrap gap-1 mb-2">{(config.presetWeightsKg || [0.25, 0.5, 1, 2, 5]).map(weight => <button key={weight} onClick={() => setValue(String(weight))} className={`text-xs px-2 py-1 rounded border ${Number(value) === Number(weight) ? "border-[#0C831F] bg-green-50" : "border-gray-200"}`}>{weight < 1 ? `${weight * 1000}g` : `${weight}kg`}</button>)}</div>}
            {mode === "amount" && <div className="flex flex-wrap gap-1 mb-2">{(config.presetAmounts || [10, 50, 100]).map(amount => <button key={amount} onClick={() => setValue(String(amount))} className={`text-xs px-2 py-1 rounded border ${Number(value) === Number(amount) ? "border-[#0C831F] bg-green-50" : "border-gray-200"}`}>₹{amount}</button>)}</div>}
            {(mode === "amount" || config.allowCustomWeight !== false) && <div className="relative"><span className="absolute left-2 top-1.5 text-sm text-gray-500">{mode === "amount" ? "₹" : "kg"}</span><input type="number" min="0" step={mode === "amount" ? "1" : "0.01"} value={value} onChange={(e) => setValue(e.target.value)} className="w-full border rounded px-7 py-1 text-sm" placeholder={mode === "amount" ? "Enter amount" : "Custom weight"} /></div>}
            <button onClick={chooseLoose} className="mt-2 w-full rounded-lg bg-[#176b2b] py-2 text-sm font-bold text-white transition hover:bg-[#0c831f]">Add to cart</button>
        </div>}
    </div>;

    const qty = cartItemDetails?.quantity || 0;
    return cartItemDetails ? <div className={`flex w-full items-center rounded-lg text-sm font-bold text-white ${data?.stock === 0 ? "bg-gray-400" : "bg-[#176b2b]"}`}><button className="w-1/3 px-1 py-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); qty === 1 ? deleteCartItem(cartItemDetails._id) : updateCartItem(cartItemDetails._id, qty - 1); }} disabled={data?.stock === 0}><Minus size={16} /></button><span className="w-1/3 p-1 text-center">{qty}</span><button className="w-1/3 p-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateCartItem(cartItemDetails._id, qty + 1); }} disabled={data?.stock === 0}><Plus size={16} /></button></div> : <button className={`rounded-lg border-2 px-3 py-1.5 text-xs font-extrabold tracking-wide transition ${data?.stock === 0 ? "border-gray-400 text-gray-400" : "border-[#318616] text-[#318616] hover:bg-[#318616] hover:text-white"}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(); }} disabled={data?.stock === 0}>ADD</button>;
}
export default AddToCartButton;
