/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import clock from "../assets/clock.png"
import { useSelector } from "react-redux";
import AddToCartButton from "./AddToCartButton";
import { IoMdListBox } from "react-icons/io";
import { GiScooter } from "react-icons/gi";
import { HiShoppingBag } from "react-icons/hi";
import waves from "../assets/waves.svg"
import feeding_india_icon_v6 from "../assets/feeding_india_icon_v6.webp"
import empty_cart from "../assets/empty_cart.webp"
import CheckOutButton from "./CheckOutButton";
import { userCart } from "../provider/CartContext";
import { useAddress } from "../provider/AddressContext";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import { discountedUnitPrice, getCartOriginalTotal, getCartSubtotal } from "../utils/cartPricing";
import { getLooseBaseUnitPrice, getLooseDiscountedUnitPrice, getLoosePriceUnitLabel } from "../utils/loosePricing";

function CartSideMenu({ setIsCartMenuOpen, setIsAddressMenuOpen, setIsCartButtonForMobile }) {

    const cartItem = useSelector((state) => state.cartItem.cart);

    const [loading, setLoading] = useState(false);
    const [checkoutQuote, setCheckoutQuote] = useState(null);
    const [quoteSnapshot, setQuoteSnapshot] = useState({ cartKey: "", version: -1, addressId: "" });
    const [isDonationChecked, setIsDonationChecked] = useState(false);
    const [isCustomTipSelected, setIsCustomTipSelected] = useState(false);
    const [tipAmount, setTipAmount] = useState(0);
    const [clickAddTip, setClickAddTip] = useState(false);
    const [custonTipInput, setCustonTipInput] = useState(0)

    const { cartSyncVersion, isCartSyncing } = userCart()
    const { addresses, isAddressLoading } = useAddress();
    const defaultAddress = addresses.find(address => address.defaultAddress) || addresses[0];
    const cartKey = JSON.stringify(cartItem.map(item => [item._id, item.quantity, item.purchaseMode, item.selectedWeightKg, item.amount]));
    const totalItems = cartItem.reduce((total, item) => total + (item.sellingType === "loose" ? 1 : Number(item.quantity) || 0), 0);
    const totalPriceWithDiscount = getCartSubtotal(cartItem);
    const totalPriceWithOutDiscount = getCartOriginalTotal(cartItem);
    const totalSavings = (totalPriceWithOutDiscount - totalPriceWithDiscount).toFixed(2);
    const quoteIsCurrent = !isCartSyncing && quoteSnapshot.cartKey === cartKey && quoteSnapshot.version === cartSyncVersion && quoteSnapshot.addressId === String(defaultAddress?._id || "");
    const quoteForAddress = quoteSnapshot.addressId === String(defaultAddress?._id || "") ? checkoutQuote : null;
    const localSubtotal = getCartSubtotal(cartItem);
    const freeMinimum = Number(quoteForAddress?.freeDeliveryMinimumOrderValue);
    const standardDeliveryFee = (Number(quoteForAddress?.deliveryCharge) || 0) + (Number(quoteForAddress?.deliverySavings) || 0);
    const deliveryCharge = quoteIsCurrent
        ? Number(checkoutQuote?.deliveryCharge) || 0
        : quoteForAddress?.freeDeliveryMinimumOrderValue !== null && quoteForAddress?.freeDeliveryMinimumOrderValue !== undefined && Number.isFinite(freeMinimum) && freeMinimum >= 0 && localSubtotal >= freeMinimum ? 0 : standardDeliveryFee;
    const handlingCharge = Number(quoteForAddress?.handlingCharge) || 0;
    const otherCharge = deliveryCharge + handlingCharge + (isDonationChecked ? 1 : 0) + tipAmount;
    const grandTotal = Number(quoteIsCurrent ? checkoutQuote?.totalAmt : totalPriceWithDiscount + deliveryCharge + handlingCharge) + (isDonationChecked ? 1 : 0) + tipAmount;

    useEffect(() => {
        document.body.classList.add("overflow-hidden");
        return () => {
            document.body.classList.remove("overflow-hidden");
        };
    }, []);
    useEffect(() => {
        if (!cartItem.length || !defaultAddress?._id || isCartSyncing || cartItem.some(item => item.optimistic)) {
            if (!cartItem.length || !defaultAddress?._id) {
                setCheckoutQuote(null);
                setQuoteSnapshot({ cartKey: "", version: -1, addressId: "" });
            }
            return undefined;
        }
        let active = true;
        Axios({ ...summaryApi.getCheckoutQuote, data: { delivery_address_id: defaultAddress._id } })
            .then(response => {
                if (active && response.data?.success) {
                    setCheckoutQuote(response.data.data);
                    setQuoteSnapshot({ cartKey, version: cartSyncVersion, addressId: String(defaultAddress._id) });
                }
            }).catch(() => {});
        return () => { active = false; };
    }, [cartKey, cartItem, defaultAddress?._id, cartSyncVersion, isCartSyncing]);
    

    return (
        <section className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]">
            <div className="fixed right-0 top-0 h-full w-full overflow-y-auto bg-[#f5f8f4] pb-10 shadow-2xl sm:w-[430px]">
                {/* Sticky Cart Header */}
                <div className="sticky top-0 z-50 flex justify-between border-b border-emerald-100 bg-white/95 backdrop-blur">
                    <h2 className="mb-1 p-4 text-lg font-extrabold text-slate-900">My Cart</h2>
                    <button
                        className="absolute right-4 top-3 rounded-full p-2 text-xl font-bold text-slate-600 transition hover:bg-emerald-50"
                        onClick={() => {
                            setIsCartMenuOpen(false)
                            setIsAddressMenuOpen(false)
                            setIsCartButtonForMobile(true)
                        }}
                    >
                        ✕
                    </button>
                </div>
                {loading ? (
                    <>
                        <div className="space-y-4 animate-pulse p-4">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                            <div className="h-32 bg-gray-200 rounded mt-4"></div>
                            <div className="h-4 bg-gray-300 rounded w-full"></div>
                            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 bg-gray-200 h-10 rounded"></div>
                    </>
                ) : (
                    <>
                        {
                            Object.keys(cartItem).length !== 0 ? (
                                <div className="h-full w-full bg-[#f5f8f4] p-4">

                                    {/* Total Savings */}
                                    <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-[#176b2b]">
                                        <span className="font-semibold">Your total savings</span>
                                        <span className="font-bold">&#8377;{totalSavings}</span>
                                    </div>

                                    {/* Clock & Products */}
                                    <div className="mt-3 w-full rounded-2xl border border-slate-100 bg-white shadow-sm">
                                        {/* Clock */}
                                        <div className="p-3 flex gap-2 items-center">
                                            <img src={clock} alt="" className="w-12 h-12 bg-[#F8F8F8] object-cover rounded-xl" />
                                            <div className="flex flex-col">
                                                <span className="text-md font-bold text-black">Free delivery in 8 minutes</span>
                                                <span className="text-xs text-gray-500">Shipment of {totalItems} {totalItems === 1 ? "item" : "items"}</span>
                                            </div>
                                        </div>
                                        {/* Products */}
                                        <div className="p-4 flex flex-col gap-4">
                                            {
                                                cartItem.map((item, index) => (
                                                    <div className="flex justify-between" key={index}>
                                                        <div className="flex gap-2">
                                                            <img
                                                                src={item?.productId?.image[0]}
                                                                alt={item?.productId?.name}
                                                                className="w-18 h-18 p-1 border-1 border-gray-200 rounded-xl"
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-sm line-clamp-2">{item?.productId?.name}</span>
                                                                <span className="text-xs">{item?.sellingType === "loose" ? `Loose · ${getLoosePriceUnitLabel(item?.productId)}` : item?.productId?.unit}</span>
                                                                {
                                                                    item?.productId.discount > 0 ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[11px] font-bold line-through text-gray-500">
                                                                                {item?.sellingType === "loose" && "MRP "}&#8377;{item?.sellingType === "loose" ? getLooseBaseUnitPrice(item?.productId) : item?.productId.price}
                                                                            </span>
                                                                            <span className="text-[11px] font-bold text-black">
                                                                                &#8377;{item?.sellingType === "loose" ? getLooseDiscountedUnitPrice(item?.productId).toFixed(2) : discountedUnitPrice(item?.productId.price, item?.productId.discount).toFixed(2)}{item?.sellingType === "loose" ? ` / ${getLoosePriceUnitLabel(item?.productId)}` : ""}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[11px] font-bold">&#8377;{item?.sellingType === "loose" ? getLooseBaseUnitPrice(item?.productId) : item?.productId.price}{item?.sellingType === "loose" ? ` / ${getLoosePriceUnitLabel(item?.productId)}` : ""}</span>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <AddToCartButton data={item?.productId} />
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    {/* Bill Details */}
                                    <div className="mt-3 w-full rounded-2xl border border-slate-100 bg-white py-2 shadow-sm">
                                        <div className="flex flex-col gap-1 px-3">
                                            <span className="font-bold text-md">Bill details</span>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1">
                                                    <IoMdListBox />
                                                    <span className="text-xs">Items total</span>
                                                    {
                                                        totalSavings > 0 && (
                                                            <div className="px-1 font-semibold rounded-md bg-[#DBE8FF] text-blue-500 text-[0.6rem]">
                                                                <span>Saved &#8377;{totalSavings}</span>
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                                <div className="flex gap-1 text-xs">
                                                    {cartItem.some(item => item.productId.discount > 0) && (
                                                        <span className="text-gray-700 line-through">&#8377;{totalPriceWithOutDiscount}</span>
                                                    )}
                                                    <span className="font-semibold">&#8377;{totalPriceWithDiscount}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1">
                                                    <GiScooter />
                                                    <span className="text-xs">Delivery charge</span>
                                                </div>
                                                <div>
                                                    {!quoteForAddress ? <span className="text-gray-500">Updating…</span> : deliveryCharge === 0 ? (
                                                        <div className="text-sm flex gap-1">
                                                            <span className="line-through text-gray-700">&#8377;{standardDeliveryFee}</span>
                                                            <span className="text-blue-500">FREE</span>
                                                        </div>
                                                    ) : (
                                                        <span>&#8377;{deliveryCharge}</span>
                                                    )}

                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-1">
                                                    <HiShoppingBag />
                                                    <span className="text-xs">Handling charge</span>
                                                </div>
                                                <span className="text-xs">{quoteForAddress ? `₹${handlingCharge}` : "Updating…"}</span>
                                            </div>
                                        </div>
                                        {/* Grand total */}
                                        <div className="mt-2 flex justify-between items-center pb-5 px-3">
                                            <span className="text-sm font-semibold">Grand total</span>
                                            <span className="text-sm font-semibold">&#8377;{grandTotal}</span>
                                        </div>
                                        {/* Waves and total saving */}
                                        <div className="-mt-4 flex flex-col gap-0">
                                            <img src={waves} alt="" />
                                            <div className="flex justify-between items-center w-full bg-[#DBE8FF] px-3 pb-3 text-sm pt-1 text-blue-500 rounded-b-xl">
                                                <span>Your total savings</span>
                                                <span>&#8377;{totalSavings}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Feeding India donation */}
                                    <div className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                        <div className="flex gap-2 items-center">
                                            <img src={feeding_india_icon_v6} alt="" className="w-13 h-10" />
                                            <div className="flex flex-col">
                                                <span className="text-md font-bold">Feeding India donation</span>
                                                <span className="text-xs">Working towards a malnutrition free India. Feeding India...read more</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 items-center">
                                            <span className="text-xs font-semibold">&#8377;1</span>
                                            <input
                                                type="checkbox"
                                                className="donation-checkbox"
                                                checked={isDonationChecked}
                                                onChange={() => setIsDonationChecked(!isDonationChecked)}
                                            />
                                        </div>
                                    </div>

                                    {/* Tip */}
                                    <div className="mt-3 w-full rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                                        <div className="flex">
                                            <div>
                                                <p className="text-md font-bold">Tip your delivery partner</p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Your kindness means a lot! 100% of your tip will go directly to your delivery partner.
                                                </p>
                                            </div>
                                            {
                                                tipAmount > 0 && (
                                                    <div className="flex flex-col gap-0">
                                                        <span className="text-[0.7rem]">&#8377;{tipAmount}</span>
                                                        <button 
                                                            className="text-xs text-green-700 cursor-pointer"
                                                            onClick={() => setTipAmount(0)}
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                )
                                            }
                                        </div>

                                        {/* Tip Options */}
                                        <div className="flex gap-2 mt-3 px-3">
                                            {
                                                isCustomTipSelected ? (
                                                    <div className="flex gap-2 items-center">
                                                        <button 
                                                            className="flex items-center gap-1 px-1 py-2 bg-[#E8F5E9] rounded-xl text-sm font-semibold cursor-pointer border-1 border-green-700"
                                                            onClick={() => setIsCustomTipSelected(!isCustomTipSelected)}
                                                        >
                                                            👏 Custom
                                                        </button>
                                                        <div className="flex flex-col gap-1">
                                                            <input 
                                                                type="number" 
                                                                className="border-b border-gray-400 focus:border-black focus:outline-none px-2 py-1"
                                                                onChange={(e) => {
                                                                    setClickAddTip(false)
                                                                    setCustonTipInput(Number(e.target.value))
                                                                }}
                                                            />
                                                            {
                                                                custonTipInput < 10 && (
                                                                    <p className="text-[0.6rem] text-red-500">Tip amount should be greater than &#8377;10</p>
                                                                )
                                                            }
                                                        </div>
                                                        {
                                                            !clickAddTip && (
                                                                <button 
                                                                    className="text-green-700 cursor-pointer"
                                                                    onClick={() => {
                                                                        setTipAmount(custonTipInput)
                                                                        setClickAddTip(true)
                                                                        setIsCustomTipSelected(!isCustomTipSelected)
                                                                    }}
                                                                >
                                                                    add
                                                                </button>
                                                            )
                                                        }
                                                        {
                                                            clickAddTip && (
                                                                <button 
                                                                    className="text-gray-500"
                                                                    onClick={() => setIsCustomTipSelected(!isCustomTipSelected)}
                                                                >
                                                                    close
                                                                </button>
                                                            )
                                                        }

                                                    </div>
                                                ) : (
                                                    <>
                                                        <button 
                                                            className={`flex items-center gap-1 px-2 py-3  rounded-xl text-sm font-semibold cursor-pointer ${tipAmount === 20? 'border-1 border-green-700 bg-[#E8F5E9]' : ' border-1 border-gray-300'}`}
                                                            onClick={() => setTipAmount(20)}
                                                        >
                                                            😀 ₹20
                                                        </button>
                                                        <button 
                                                            className={`flex items-center gap-1 px-2 py-3  rounded-xl text-sm font-semibold cursor-pointer ${tipAmount === 30? 'border-1 border-green-700 bg-[#E8F5E9]' : ' border-1 border-gray-300'}`}
                                                            onClick={() => setTipAmount(30)}
                                                        >
                                                            🤩 ₹30
                                                        </button>
                                                        <button 
                                                            className={`flex items-center gap-1 px-2 py-3  rounded-xl text-sm font-semibold cursor-pointer ${tipAmount === 50? 'border-1 border-green-700 bg-[#E8F5E9]' : ' border-1 border-gray-300'}`}
                                                            onClick={() => setTipAmount(50)}
                                                        >
                                                            😍 ₹50
                                                        </button>
                                                        <button
                                                            className={`flex items-center gap-1 px-2 py-3 rounded-xl text-sm font-semibold cursor-pointer ${
                                                                tipAmount !== 50 && tipAmount !== 30 && tipAmount !== 20
                                                                ? 'border-1 border-green-700 bg-[#E8F5E9]'
                                                                : 'border-1 border-gray-300'
                                                            }`}
                                                            onClick={() => setIsCustomTipSelected(!isCustomTipSelected)}
                                                        >
                                                            👏 Custom
                                                        </button>
                                                    </>
                                                )
                                            }
                                        </div>
                                    </div>

                                    {/* Cancellation Policy */}
                                    <div className="mt-5 w-full rounded-2xl border border-slate-100 bg-white shadow-sm">
                                        <div className="flex flex-col px-3 py-2">
                                            <p className="text-md font-bold">Cancellation Policy</p>
                                            <p className="text-xs text-gray-500 mt-2">Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.</p>
                                        </div>
                                    </div>

                                    {/* empty space */}
                                    <div className="pb-50">

                                    </div>

                                    {/* Checkout Button */}
                                    <CheckOutButton 
                                        grandTotal={grandTotal} 
                                        setIsAddressMenuOpen={setIsAddressMenuOpen}
                                        setIsCartMenuOpen={setIsCartMenuOpen}
                                        totalItems={totalItems}
                                        totalPriceWithOutDiscount={totalPriceWithOutDiscount}
                                        totalPriceWithDiscount={totalPriceWithDiscount}
                                        otherCharge={otherCharge}
                                        disabled={isAddressLoading || (addresses.length > 0 && (!quoteIsCurrent || isCartSyncing))}
                                    />
                                </div>
                            ) : (
                                <div className="h-full bg-white">
                                    <img src={empty_cart} alt="" />
                                    <h1 className="text-center text-4xl font-bold">Empty Cart</h1>
                                </div>
                            )
                        }
                        {/* Cart items */}
                    </>
                )}
            </div>
        </section>
    );
}

export default CartSideMenu;
