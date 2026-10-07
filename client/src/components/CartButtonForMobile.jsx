/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineShoppingCart } from "react-icons/hi";
import { useSelector } from "react-redux";
import { FaCaretRight } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { userCart } from "../provider/CartContext";
import { useAddress } from "../provider/AddressContext";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import { getCartSubtotal } from "../utils/cartPricing";

function CartButtonForMobile({setIsCartButtonForMobile, isCartMenuOpen}) {

    const cartItem = useSelector((state) => state.cartItem.cart);
    const navigate = useNavigate();
    const { addresses } = useAddress();
    const { cartSyncVersion, isCartSyncing } = userCart();
    const defaultAddress = addresses.find(address => address.defaultAddress) || addresses[0];
    const [checkoutQuote, setCheckoutQuote] = useState(null);
    const [quoteSnapshot, setQuoteSnapshot] = useState({ cartKey: "", version: -1, addressId: "" });
    const quoteSequenceRef = useRef(0);
    const cartKey = JSON.stringify(cartItem.map(item => [item._id, item.quantity, item.purchaseMode, item.selectedWeightKg, item.amount]));

    const { totalItems, totalPrice } = useMemo(() => {
        const itemsCount = cartItem.reduce((prev, curr) => prev + (curr.sellingType === "loose" ? 1 : curr.quantity), 0);
        const priceCount = getCartSubtotal(cartItem);
        return { totalItems: itemsCount, totalPrice: priceCount };
    }, [cartItem]);

    useEffect(() => {
        const sequence = ++quoteSequenceRef.current;
        if (!cartItem.length || !defaultAddress?._id) {
            setCheckoutQuote(null);
            setQuoteSnapshot({ cartKey: "", version: -1, addressId: "" });
            return undefined;
        }
        if (isCartSyncing || cartItem.some(item => item.optimistic)) return undefined;

        let active = true;
        Axios({
            ...summaryApi.getCheckoutQuote,
            data: { delivery_address_id: defaultAddress._id }
        }).then(response => {
            if (active && sequence === quoteSequenceRef.current && response.data?.success) {
                setCheckoutQuote(response.data.data);
                setQuoteSnapshot({ cartKey, version: cartSyncVersion, addressId: String(defaultAddress._id) });
            }
        }).catch(() => {}).finally(() => {
            // An unfinished cart mutation schedules a fresh quote when it settles.
        });
        return () => { active = false; };
    }, [cartKey, cartItem, defaultAddress?._id, cartSyncVersion, isCartSyncing]);

    const minimumValue = quoteSnapshot.addressId === String(defaultAddress?._id || "")
        ? checkoutQuote?.freeDeliveryMinimumOrderValue
        : null;
    const freeMinimum = Number(minimumValue);
    const quoteIsCurrent = !isCartSyncing
        && quoteSnapshot.cartKey === cartKey
        && quoteSnapshot.version === cartSyncVersion
        && quoteSnapshot.addressId === String(defaultAddress?._id || "");
    const progressSubtotal = quoteIsCurrent ? Number(checkoutQuote?.subTotalAmt) : totalPrice;
    const freeDeliveryMessage = cartItem.length && minimumValue !== null && minimumValue !== undefined && Number.isFinite(freeMinimum) && freeMinimum >= 0
        ? progressSubtotal >= freeMinimum
            ? "✓ FREE delivery unlocked"
            : `Add ₹${Math.ceil(freeMinimum - progressSubtotal)} more for FREE delivery`
        : "";
    return (
        <>
        {freeDeliveryMessage && <div className={`fixed bottom-[4.75rem] left-3 right-3 z-50 flex justify-center lg:hidden xl:hidden ${isCartMenuOpen ? "hidden" : ""}`}><span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#176b2b] shadow-sm" role="status">{freeDeliveryMessage}</span></div>}
        <div className={`fixed bottom-3 left-3 right-3 z-50 flex h-15 items-center justify-between rounded-2xl bg-[#176b2b] px-3 shadow-[0_10px_28px_rgba(23,107,43,0.3)] lg:hidden xl:hidden ${isCartMenuOpen? "hidden" : ""}`}>
            {/* Cart Logo, number of items and total price */}
            <div className="flex gap-2">
                <button className="z-20 rounded-xl bg-white/15 p-2 text-white">
                    <HiOutlineShoppingCart size={22}/>
                </button>
                <div className="flex flex-col text-white font-semibold">
                    <span className="text-xs font-semibold">{totalItems} items</span>
                    <span className="text-md font-bold">&#8377; {totalPrice}</span>
                </div>
            </div>
            {/* View Cart */}
            <div 
                className="flex cursor-pointer items-center rounded-xl bg-white px-3 py-2 text-sm font-bold text-[#176b2b]"
                onClick={() => {
                    navigate("/cart")
                    setIsCartButtonForMobile(false)
                }}
            >
                <span>View Cart</span>
                <FaCaretRight size={15} className="mt-1"/>
            </div>
        </div>
        </>
    )
}

export default CartButtonForMobile
