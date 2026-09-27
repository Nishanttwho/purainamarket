/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { userCart } from "../provider/CartContext";
import { useSelector } from "react-redux";
import Axios from "../utils/Axios";
import toast from "react-hot-toast";
import AxiosToastError from "../utils/AxiosToastError";
import summaryApi from "../common/summaryApi";
import { Minus, Plus } from "lucide-react";

function AddToCartButton({ data }) {
    const { fetchCartItem, updateCartItem, deleteCartItem } = userCart();
    const cartItem = useSelector(state => state.cartItem.cart);
    const isLoose = data?.sellingType === "loose";
    const config = data?.looseConfig || {};
    const [cartItemDetails, setCartItemsDetails] = useState();
    const [chooserOpen, setChooserOpen] = useState(false);
    const [mode, setMode] = useState("weight");
    const [value, setValue] = useState("");

    useEffect(() => {
        if (!isLoose) setCartItemsDetails(cartItem.find(item => item.productId._id === data._id && item.sellingType !== "loose"));
    }, [data, cartItem, isLoose]);

    const addItem = async (payload = {}) => {
        try {
            const response = await Axios({ ...summaryApi.addToCart, data: { productId: data?._id, ...payload } });
            if (response.data.success) { toast.success(response.data.message); fetchCartItem(); setChooserOpen(false); setValue(""); }
            else toast.error(response.data.message);
        } catch (error) { AxiosToastError(error); }
    };
    const chooseLoose = (e) => {
        e.preventDefault(); e.stopPropagation();
        const selected = Number(value);
        if (!selected || selected <= 0) return toast.error(mode === "amount" ? "Enter a valid amount." : "Choose or enter a valid weight.");
        addItem(mode === "amount" ? { purchaseMode: "amount", amount: selected } : { purchaseMode: "weight", selectedWeightKg: selected });
    };

    if (isLoose) return <div className="relative" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <button disabled={data?.stock === 0} onClick={() => setChooserOpen(!chooserOpen)} className={`px-3 py-1 border-2 rounded-lg font-medium ${data?.stock === 0 ? "border-gray-400 text-gray-400" : "text-[#318616] border-[#318616] hover:bg-[#318616] hover:text-white"}`}>ADD</button>
        {chooserOpen && <div className="absolute right-0 bottom-full mb-2 z-30 w-64 rounded-lg bg-white p-3 shadow-xl border text-left">
            <p className="text-xs font-semibold text-gray-700 mb-2">Choose how much</p>
            <div className="flex gap-1 mb-2"><button onClick={() => { setMode("weight"); setValue(""); }} className={`text-xs px-2 py-1 rounded ${mode === "weight" ? "bg-[#0C831F] text-white" : "bg-gray-100"}`}>By weight</button>{config.allowAmount !== false && <button onClick={() => { setMode("amount"); setValue(""); }} className={`text-xs px-2 py-1 rounded ${mode === "amount" ? "bg-[#0C831F] text-white" : "bg-gray-100"}`}>By ₹ amount</button>}</div>
            {mode === "weight" && <div className="flex flex-wrap gap-1 mb-2">{(config.presetWeightsKg || [0.25, 0.5, 1, 2, 5]).map(weight => <button key={weight} onClick={() => setValue(String(weight))} className={`text-xs px-2 py-1 rounded border ${Number(value) === Number(weight) ? "border-[#0C831F] bg-green-50" : "border-gray-200"}`}>{weight < 1 ? `${weight * 1000}g` : `${weight}kg`}</button>)}</div>}
            {mode === "amount" && <div className="flex flex-wrap gap-1 mb-2">{(config.presetAmounts || [10, 50, 100]).map(amount => <button key={amount} onClick={() => setValue(String(amount))} className={`text-xs px-2 py-1 rounded border ${Number(value) === Number(amount) ? "border-[#0C831F] bg-green-50" : "border-gray-200"}`}>₹{amount}</button>)}</div>}
            {(mode === "amount" || config.allowCustomWeight !== false) && <div className="relative"><span className="absolute left-2 top-1.5 text-sm text-gray-500">{mode === "amount" ? "₹" : "kg"}</span><input type="number" min="0" step={mode === "amount" ? "1" : "0.01"} value={value} onChange={(e) => setValue(e.target.value)} className="w-full border rounded px-7 py-1 text-sm" placeholder={mode === "amount" ? "Enter amount" : "Custom weight"} /></div>}
            <button onClick={chooseLoose} className="mt-2 w-full rounded bg-[#0C831F] py-1.5 text-sm font-semibold text-white">Add to cart</button>
        </div>}
    </div>;

    const qty = cartItemDetails?.quantity || 0;
    return cartItemDetails ? <div className={`w-full flex items-center font-bold text-md text-white ${data?.stock === 0 ? "bg-gray-400" : "bg-[#318616]"} rounded-lg`}><button className="px-1 py-2 w-1/3" onClick={(e) => { e.preventDefault(); e.stopPropagation(); qty === 1 ? deleteCartItem(cartItemDetails._id) : updateCartItem(cartItemDetails._id, qty - 1); }} disabled={data?.stock === 0}><Minus size={16} /></button><span className="p-1 w-1/3 text-center text-md">{qty}</span><button className="p-1 w-1/3" onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateCartItem(cartItemDetails._id, qty + 1); }} disabled={data?.stock === 0}><Plus size={16} /></button></div> : <button className={`px-4 py-1 border-2 rounded-lg font-medium ${data?.stock === 0 ? "border-gray-400 text-gray-400" : "text-[#318616] border-[#318616] hover:bg-[#318616] hover:text-white"}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(); }} disabled={data?.stock === 0}>ADD</button>;
}
export default AddToCartButton;
