import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { IoMdListBox } from "react-icons/io";
import { HiShoppingBag } from "react-icons/hi";
import feeding_india_icon_v6 from "../assets/feeding_india_icon_v6.webp"
import empty_cart from "../assets/empty_cart.webp"
import { userCart } from "../provider/CartContext";
import AddToCartButton from "../components/AddToCartButton";
import { FaChevronRight } from "react-icons/fa6";
import { useAddress } from "../provider/AddressContext";
import { CiLocationOn } from "react-icons/ci";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock3, PackageCheck, Trash2, Truck } from "lucide-react";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import { useStoreAvailability } from "../provider/StoreAvailabilityContext";
import "./ViewCart.css";
function ViewCart() {

    const capitalizeFirstLetter = (str) => {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const navigate = useNavigate()
    const location = useLocation();
    const { availability } = useStoreAvailability();
    
    const { addresses } = useAddress();
    // console.log(addresses);
    const defaultAddress = addresses.find(address => address.defaultAddress) || addresses[0];

    const [loading, setLoading] = useState(true);
    const cartItem = useSelector((state) => state.cartItem.cart);
    const [totalPriceWithDiscount, setTotalPriceWithDiscount] = useState(0);
    const [totalPriceWithOutDiscount, setTotalPriceWithOutDiscount] = useState(0);
    const [totalSavings, setTotalSavings] = useState(0);
    const [checkoutQuote, setCheckoutQuote] = useState(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [isDonationChecked, setIsDonationChecked] = useState(false);
    const [isCustomTipSelected, setIsCustomTipSelected] = useState(false);
    const [tipAmount, setTipAmount] = useState(0);
    const [clickAddTip, setClickAddTip] = useState(false);
    const [custonTipInput, setCustonTipInput] = useState(0)
    const [totalItems, setTotalItems] = useState(0)
    const [couponInput, setCouponInput] = useState(location.state?.couponCode || "");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState("");
    const [couponLoading, setCouponLoading] = useState(false);
    const autoApplyAttempted = useRef(false);

    const deliveryCharge = Number(checkoutQuote?.deliveryCharge) || 0;
    const handlingCharge = Number(checkoutQuote?.handlingCharge) || 0;
    const otherCharge = deliveryCharge + handlingCharge;
    const displayedItemsTotal = Number(checkoutQuote?.subTotalAmt ?? totalPriceWithDiscount);
    const grandTotal = Number(checkoutQuote?.totalAmt ?? (totalPriceWithDiscount + otherCharge - (Number(appliedCoupon?.discountAmount) || 0)));
    const cartKey = JSON.stringify(cartItem.map((item) => [item._id, item.quantity, item.purchaseMode, item.selectedWeightKg, item.amount]));
    const couponDiscount = Number(checkoutQuote?.couponDiscount ?? appliedCoupon?.discountAmount) || 0;
    const displayedSavings = (Number(totalSavings) + couponDiscount + (Number(checkoutQuote?.deliverySavings) || 0)).toFixed(2);

    const { fetchCartItem, deleteCartItem } = userCart()

    useEffect(() => {
        fetchCartItem().finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (appliedCoupon && appliedCoupon.cartKey !== cartKey) {
            setAppliedCoupon(null);
            setCouponError("Your cart changed. Apply the coupon again to refresh the quote.");
        }
    }, [cartKey, appliedCoupon]);

    const applyCouponCode = async (codeValue) => {
        const code = codeValue.trim();
        if (!code) {
            setCouponError("Enter a coupon code.");
            return;
        }
        setCouponLoading(true);
        setCouponError("");
        try {
            const response = await Axios({ ...summaryApi.validateCoupon, data: { code } });
            if (response.data?.success !== true || !response.data.data) throw new Error(response.data?.message || "Coupon could not be applied.");
            setCouponInput(response.data.data.code);
            setAppliedCoupon({ ...response.data.data, cartKey });
        } catch (error) {
            setAppliedCoupon(null);
            setCouponError(error.response?.data?.message || error.message || "Coupon could not be applied.");
        } finally {
            setCouponLoading(false);
        }
    };

    const applyCoupon = (event) => {
        event.preventDefault();
        return applyCouponCode(couponInput);
    };

    useEffect(() => {
        if (!location.state?.applyCoupon || loading || !cartItem.length || autoApplyAttempted.current) return;
        autoApplyAttempted.current = true;
        applyCouponCode(location.state.couponCode || "");
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, location.state, loading, cartItem.length, navigate]);

    useEffect(() => {
        let itemsCount = 0;
        let priceCountWithDiscount = 0;
        let priceCountWithOutDiscount = 0;

        itemsCount = cartItem.reduce((prev, curr) => prev + (curr.sellingType === "loose" ? 1 : curr.quantity), 0);

        priceCountWithDiscount = parseFloat(
            cartItem.reduce((prev, curr) => {
                const isLoose = curr.sellingType === "loose";
                const price = Number(curr.productId.price);
                const linePrice = isLoose
                    ? Number(curr.linePrice ?? price)
                    : price * (1 - (Number(curr.productId.discount) || 0) / 100);
                return prev + linePrice * (isLoose ? 1 : Number(curr.quantity));
            }, 0).toFixed(2)
        );

        priceCountWithOutDiscount = parseFloat(
            cartItem.reduce((prev, curr) => {
                const isLoose = curr.sellingType === "loose";
                const linePrice = isLoose ? Number(curr.linePrice ?? curr.productId.price) : Number(curr.productId.price);
                return prev + linePrice * (isLoose ? 1 : Number(curr.quantity));
            }, 0).toFixed(2)
        );

        setTotalItems(itemsCount);
        setTotalPriceWithDiscount(priceCountWithDiscount);
        setTotalPriceWithOutDiscount(priceCountWithOutDiscount);
        setTotalSavings((priceCountWithOutDiscount - priceCountWithDiscount).toFixed(2));
    }, [cartItem]);

    useEffect(() => {
        if (!cartItem.length) return;
        let active = true;
        setQuoteLoading(true);
        setCheckoutQuote(null);
        Axios({ ...summaryApi.getCheckoutQuote, data: { delivery_address_id: defaultAddress?._id, couponCode: appliedCoupon?.code || "" } })
            .then((response) => { if (active && response.data?.success) setCheckoutQuote(response.data.data); })
            .catch((error) => { if (active) setCouponError(error.response?.data?.message || "Could not refresh checkout charges."); })
            .finally(() => { if (active) setQuoteLoading(false); });
        return () => { active = false; };
    }, [cartKey, defaultAddress?._id, appliedCoupon?.code]);


    return (
        <div className="cart-page">
            {/* Sticky Cart Header */}
            <div className="cart-page-header">
                <div>
                    <p className="cart-eyebrow">YOUR BASKET</p>
                    <h1>My cart</h1>
                    {!loading && <span>{totalItems} {totalItems === 1 ? "item" : "items"}</span>}
                </div>
                <button className="cart-continue-button" type="button" onClick={() => navigate("/")}>
                    <ArrowLeft size={17} /> Continue shopping
                </button>
            </div>
            {loading ? (
                <div className="cart-skeleton" aria-label="Loading your cart" role="status">
                    <span className="cart-skeleton-line cart-skeleton-short" />
                    <span className="cart-skeleton-line" />
                    <span className="cart-skeleton-line cart-skeleton-medium" />
                    <div className="cart-skeleton-row"><span /><div><span /><span /></div><span /></div>
                    <div className="cart-skeleton-row"><span /><div><span /><span /></div><span /></div>
                </div>
            ) : (
                <>
                    {
                        Object.keys(cartItem).length !== 0 ? (
                            <div className="cart-body bg-[#F5F7FD] h-full w-full p-4">

                                {/* Total Savings */}
                                <div className="cart-savings-banner bg-[#DBE8FF] p-3 text-sm text-blue-500 flex items-center justify-between rounded-2xl">
                                    <span className="font-semibold">Your total savings</span>
                                    <span className="font-bold">&#8377;{displayedSavings}</span>
                                </div>

                                {/* Clock & Products */}
                                <div className="cart-panel cart-items-panel w-full bg-white mt-2 rounded-xl">
                                    {/* Clock */}
                                    <div className="p-3 flex gap-2 items-center">
                                        <span className="cart-delivery-icon" aria-hidden="true"><Clock3 size={22} /></span>
                                        <div className="flex flex-col">
                                            <span className="text-md font-bold text-black">{checkoutQuote?.estimatedDeliveryMinutes ? `${deliveryCharge === 0 ? "Free delivery" : "Delivery"} in about ${checkoutQuote.estimatedDeliveryMinutes} minutes` : deliveryCharge === 0 ? "Free delivery" : "Delivery details"}</span>
                                            <span className="text-xs text-gray-500"><PackageCheck size={13} className="mr-1 inline" />Shipment of {totalItems} {totalItems === 1 ? "item" : "items"}</span>
                                        </div>
                                    </div>
                                    {/* Products */}
                                    <div className="cart-products-list p-4 flex flex-col gap-4">
                                        {
                                            cartItem.map((item, index) => (
                                                <div className="cart-product-row flex justify-between" key={item._id || index}>
                                                    <div className="cart-product-main flex gap-2">
                                                        <img
                                                            src={item?.productId?.image[0]}
                                                            alt={item?.productId?.name}
                                                            className="cart-product-image w-18 h-18 p-1 border-1 border-gray-200 rounded-xl"
                                                        />
                                                        <div className="cart-product-copy flex flex-col">
                                                            <span className="cart-product-name text-sm line-clamp-2">{item?.productId?.name}</span>
                                                            <span className="cart-product-kind text-xs">{item.sellingType === "loose" ? "Loose / open" : `Packed${item?.productId?.unit ? ` · ${item.productId.unit}` : ""}`}</span>
                                                            {item.sellingType === "loose" && (
                                                                <span className="cart-product-selection">
                                                                    {item.purchaseMode === "amount"
                                                                        ? `₹${item.amount} purchase · about ${item.selectedWeightKg} kg`
                                                                        : `Weight · ${Number(item.selectedWeightKg) < 1 ? `${Number(item.selectedWeightKg) * 1000} g` : `${item.selectedWeightKg} kg`}`}
                                                                </span>
                                                            )}
                                                            {
                                                                item?.productId.discount > 0 ? (
                                                                    <div className="cart-product-prices flex items-center gap-1">
                                                                        <span className="cart-product-original text-[11px] font-bold line-through text-gray-500">
                                                                            &#8377;{item?.productId.price}
                                                                        </span>
                                                                        <span className="cart-product-current text-[11px] font-bold text-black">
                                                                            &#8377;{(item?.productId.price - (item?.productId.price * item?.productId.discount / 100)).toFixed(2)}{item.sellingType === "loose" ? "/kg" : ""}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="cart-product-current text-[11px] font-bold">&#8377;{item?.productId.price}{item.sellingType === "loose" ? "/kg" : ""}</span>
                                                                )
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="cart-product-actions">
                                                        <AddToCartButton data={item?.productId} />
                                                        {item.sellingType === "loose" && (
                                                            <button className="cart-remove-button" type="button" onClick={() => deleteCartItem(item._id)} aria-label={`Remove ${item?.productId?.name} from cart`}>
                                                                <Trash2 size={17} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>

                                <section className="cart-panel cart-coupon-panel" aria-labelledby="cart-coupon-title">
                                    <div className="cart-coupon-heading">
                                        <div><h2 id="cart-coupon-title">Have a coupon?</h2><p>Enter a code to check your savings.</p></div>
                                        {appliedCoupon && <button type="button" onClick={() => { setAppliedCoupon(null); setCouponInput(""); setCouponError(""); }}>Remove</button>}
                                    </div>
                                    <form className="cart-coupon-form" onSubmit={applyCoupon}>
                                        <label className="sr-only" htmlFor="cart-coupon-code">Coupon code</label>
                                        <input id="cart-coupon-code" value={couponInput} onChange={(event) => { setCouponInput(event.target.value.toUpperCase()); setCouponError(""); }} placeholder="Enter coupon code" autoComplete="off" disabled={Boolean(appliedCoupon)} />
                                        {!appliedCoupon && <button type="submit" disabled={couponLoading || !couponInput.trim()}>{couponLoading ? "Checking…" : "Apply"}</button>}
                                    </form>
                                    {couponError && <p className="cart-coupon-error" role="alert">{couponError}</p>}
                                    {appliedCoupon && <p className="cart-coupon-success" role="status">You saved ₹{Number(appliedCoupon.discountAmount).toFixed(2)} with this coupon.</p>}
                                </section>

                                {/* Bill Details */}
                                <div className="cart-panel cart-bill-panel w-full bg-white mt-3 rounded-xl ">
                                    <div className="flex flex-col gap-1 px-3">
                                        <span className="font-bold text-md">Bill details</span>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1">
                                                <IoMdListBox />
                                                <span className="text-xs">Items total</span>
                                                {
                                                    Number(displayedSavings) > 0 && (
                                                        <div className="px-1 font-semibold rounded-md bg-[#DBE8FF] text-blue-500 text-[0.6rem]">
                                                            <span>Saved &#8377;{displayedSavings}</span>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                            <div className="flex gap-1 text-xs">
                                                {cartItem.some(item => item.productId.discount > 0) && (
                                                    <span className="text-gray-700 line-through">&#8377;{totalPriceWithOutDiscount}</span>
                                                )}
                                                <span className="font-semibold">&#8377;{displayedItemsTotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        {appliedCoupon && <div className="cart-coupon-discount-row"><span>Coupon · {appliedCoupon.code}</span><strong>−₹{Number(appliedCoupon.discountAmount).toFixed(2)}</strong></div>}
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1">
                                                <Truck size={15} />
                                                <span className="text-xs">Delivery charge</span>
                                            </div>
                                            <div>
                                                {deliveryCharge === 0 ? (
                                                    <div className="text-sm flex gap-1">
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
                                            <span className="text-xs">&#8377;{handlingCharge}</span>
                                        </div>
                                    </div>
                                    {/* Grand total */}
                                    <div className="cart-grand-total mt-2 flex justify-between items-center pb-5 px-3">
                                        <span className="text-sm font-semibold">Grand total</span>
                                        <span className="text-sm font-semibold">{quoteLoading ? "Updating…" : `₹${grandTotal.toFixed(2)}`}</span>
                                    </div>
                                    {/* Waves and total saving */}
                                    <div className="-mt-4 flex flex-col gap-0">
                                        <span className="cart-bill-divider" aria-hidden="true" />
                                        <div className="flex justify-between items-center w-full bg-[#DBE8FF] px-3 pb-3 text-sm pt-1 text-blue-500 rounded-b-xl">
                                            <span>Your total savings</span>
                                            <span>&#8377;{displayedSavings}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Feeding India donation */}
                                <div className="cart-panel cart-donation-panel w-full bg-white mt-3 rounded-xl flex justify-between items-center p-4">
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
                                <div className="cart-panel cart-tip-panel w-full bg-white mt-3 rounded-xl p-2">
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
                                    <div className="cart-tip-options flex gap-2 mt-3 px-3">
                                        {
                                            isCustomTipSelected ? (
                                                <div className=" flex gap-2 items-center">
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
                                                        className={`flex items-center gap-1 px-2 py-3  rounded-xl text-sm font-semibold cursor-pointer ${tipAmount === 20 ? 'border-1 border-green-700 bg-[#E8F5E9]' : ' border-1 border-gray-300'}`}
                                                        onClick={() => setTipAmount(20)}
                                                    >
                                                        😀 ₹20
                                                    </button>
                                                    <button
                                                        className={`flex items-center gap-1 px-2 py-3  rounded-xl text-sm font-semibold cursor-pointer ${tipAmount === 30 ? 'border-1 border-green-700 bg-[#E8F5E9]' : ' border-1 border-gray-300'}`}
                                                        onClick={() => setTipAmount(30)}
                                                    >
                                                        🤩 ₹30
                                                    </button>
                                                    <button
                                                        className={`flex items-center gap-1 px-2 py-3  rounded-xl text-sm font-semibold cursor-pointer ${tipAmount === 50 ? 'border-1 border-green-700 bg-[#E8F5E9]' : ' border-1 border-gray-300'}`}
                                                        onClick={() => setTipAmount(50)}
                                                    >
                                                        😍 ₹50
                                                    </button>
                                                    <button
                                                        className={`flex items-center gap-1 px-2 py-3 rounded-xl text-sm font-semibold cursor-pointer ${tipAmount !== 50 && tipAmount !== 30 && tipAmount !== 20
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
                                <div className="cart-panel cart-policy-panel w-full bg-white mt-5 rounded-xl">
                                    <div className="flex flex-col px-3 py-2">
                                        <p className="text-md font-bold">Cancellation Policy</p>
                                        <p className="text-xs text-gray-500 mt-2">Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.</p>
                                    </div>
                                </div>

                                {/* empty space */}
                                <div className="cart-checkout-spacer pb-30">

                                </div>

                                {/* Checkout Button */}
                                <div className="cart-checkout-bar">
                                    {/* Addresses*/}
                                    <div>
                                        {
                                            addresses.length === 0 ? (
                                                <div>
                                                </div>
                                            ) : (
                                                <div className="cart-address-summary pb-5 mb-3 border-b border-gray-500 rounded-t-xl flex justify-between items-center">
                                                    <div className="flex gap-2">
                                                        <CiLocationOn size={25} />
                                                        <div className="flex flex-col">
                                                            <p className="text-sm font-semibold">Delivering to {capitalizeFirstLetter(defaultAddress.saveAs)}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {[defaultAddress?.street, defaultAddress?.flatHouseNumber, defaultAddress?.floor, defaultAddress?.landmark, `${defaultAddress?.city}-${defaultAddress?.pincode}`]
                                                                    .filter(Boolean)
                                                                    .join(", ")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="text-sm text-[#0C831F] font-semibold"
                                                        onClick={() => {
                                                            navigate("/dashboard/addresses")
                                                        }}
                                                    >
                                                        Change
                                                    </button>
                                                </div>
                                            )
                                        }
                                    </div>
                                    <div className={`cart-checkout-button-wrap flex justify-center text-white px-2 py-4 rounded-xl ${availability?.isOpen === true ? "bg-[#0C831F]" : "bg-slate-400"}`}>
                                        <button
                                            className="flex items-center gap-1 disabled:cursor-not-allowed"
                                            disabled={quoteLoading || !checkoutQuote}
                                            onClick={() => {
                                                if (availability?.isOpen !== true) {
                                                    toast.error(availability?.message || "Ordering is currently unavailable.");
                                                    return;
                                                }
                                                if(addresses.length > 0) {
                                                    navigate("/checkout", { state: { grandTotal, totalItems, totalPriceWithOutDiscount, totalPriceWithDiscount, otherCharge, couponCode: appliedCoupon?.code || "", couponDiscount: appliedCoupon?.discountAmount || 0 } })
                                                } else {
                                                    navigate("/dashboard/addresses")
                                                    toast.error("Please add your address")
                                                }
                                            }}
                                        >
                                            <span>Add payment method</span>
                                            <FaChevronRight />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                                            <div className="cart-empty">
                                                <img src={empty_cart} alt="Empty grocery basket" />
                                                <h1>Your cart is empty</h1>
                                                <p>Find something fresh for your next delivery.</p>
                                                <button type="button" onClick={() => navigate("/")}>Browse groceries</button>
                            </div>
                        )
                    }
                    {/* Cart items */}
                </>
            )}
        </div>
    )
}

export default ViewCart
