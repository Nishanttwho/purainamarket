/* eslint-disable no-undef */
import { useEffect, useState } from "react";
import { useAddress } from "../provider/AddressContext";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Banknote, CheckCircle2, CreditCard, MapPin } from "lucide-react";
import toast from "react-hot-toast"
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import { userCart } from "../provider/CartContext";
import { useStoreAvailability } from "../provider/StoreAvailabilityContext";
import { discountedUnitPrice } from "../utils/cartPricing";
import { getLooseBaseUnitPrice, getLooseDiscountedUnitPrice, getLoosePriceUnitLabel } from "../utils/loosePricing";

function CheckOut() {

    const user = useSelector(state => state.user);
    const { addresses, isAddressLoading } = useAddress()
    const { clearTheCart } = userCart()
    const { availability } = useStoreAvailability();
    const canPlaceOrder = availability?.isOpen === true;
    const navigate = useNavigate();
    const location = useLocation();

    const { grandTotal, totalItems, totalPriceWithOutDiscount, otherCharge, couponCode = "" } = location.state || {};
    // console.log("otherCharge: ", otherCharge);

    const cartItem = useSelector((state) => state.cartItem.cart);
    // console.log("cartItem", cartItem);

    const defaultAddress = addresses.find((address) => address.defaultAddress === true) || addresses[0]
    // console.log("defaultAddress: ", defaultAddress)

    const [optionOpen, setOptionOpen] = useState("")
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("")
    const [isConfirmationScreenActive, setIsConfirmationScreenActive] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isAddressLoading && !defaultAddress) {
            toast.error("Please add a delivery address to continue.");
            navigate("/dashboard/addresses", { replace: true, state: { returnToCheckout: true, checkoutState: location.state || {} } });
        }
    }, [isAddressLoading, defaultAddress, navigate, location.state]);

    const handleCashOnDeliveryOrder = async () => {
        if (!defaultAddress?._id) return toast.error("Please select a delivery address.");
        try {
            const response = await Axios({
                ...summaryApi.createCODOrder,
                data: {
                    itemList: cartItem,
                    totalAmt: grandTotal,
                    otherCharge: otherCharge,
                    subTotalAmt: totalPriceWithOutDiscount,
                    couponCode,
                    delivery_address_id: defaultAddress._id,
                }
            })

            if (response.data.success) {
                toast.success(response.data.message)
                clearTheCart()
                navigate("/dashboard/my-orders")
            } else {
                toast.error(response.data.message)
            }

        } catch (error) {
            // console.log(error);
            toast.error(error)
        } finally {
            setIsConfirmationScreenActive(false)
            setLoading(false)
        }
    }

    const handleRazorpayPayment = async () => {
        if (!defaultAddress?._id) return toast.error("Please select a delivery address.");
        try {
            const response = await Axios({
                ...summaryApi.addRazorpayPaymentOrder,
                data: {
                    itemList: cartItem,
                    totalAmt: grandTotal,
                    otherCharge: otherCharge,
                    subTotalAmt: totalPriceWithOutDiscount,
                    couponCode,
                    delivery_address_id: defaultAddress._id,
                }
            });

            // console.log(response);
            let orderData = response.data.order
            const options = {
                key: import.meta.env.VITE_RAZORPAY_ID_KEY,
                amount: response.data.order.amount,
                currency: 'INR',
                name: "PurainaMarket",
                description: 'Purchasing with Razorpay',
                order_id: response.data.order.id,
                prefill: {
                    name: user.name,
                    email: user.email,
                    contact: user.mobile,
                },
                theme: { color: '#FFC602' },
                handler: function (paymentResponse) {
                    // Send payment details to backend for verification
                    Axios({
                        ...summaryApi.verifyRazorPaymentOrder,
                        data: {
                            paymentResponse,
                            orderData
                        },
                        headers: { "Content-Type": "application/json" }
                    })
                        .then(res => {
                            // console.log("Verification Response:", res.data);

                            // Redirect based on backend response
                            if (res.data.success) {
                                navigate("/success");
                                clearTheCart()
                            } else {
                                navigate("/cancel");
                            }
                        })
                        .catch(err => console.error("Verification Error:", err));
                }

            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (error) {
            toast.error(error.message || error);
        }
    };

    const handlePayNow = async () => {
        if (!canPlaceOrder) {
            toast.error(availability?.message || "Ordering is currently unavailable.");
            setIsConfirmationScreenActive(false);
            return;
        }
        try {
            setLoading(true)
            if (selectedPaymentMethod === "cash") {
                handleCashOnDeliveryOrder()
            } else if (selectedPaymentMethod === "razorpay") {
                handleRazorpayPayment()
            }    
            setIsConfirmationScreenActive(false)
            setLoading(false)
        } catch (error) {
            toast.error(error.message || error);
            setLoading(false)

        } finally {
            setLoading(false)
        }
        
    }

    return (
        <>
            <div className="flex flex-col gap-5 min-h-[90vh] w-screen lg:flex-row lg:w-full xl:w-full lg:max-w-[1100px] xl:max-w-[1100px] mx-auto select-none py-5 pb-24 lg:p-8">
                {/* Left Section - Payment Methods */}
                <div className="w-full lg:w-2/3 xl:w-2/3 p-4 sm:p-6 rounded-2xl bg-white">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-700">Secure checkout</p>
                    <h2 className="text-xl lg:text-2xl font-bold mb-5 text-slate-900">Choose how to pay</h2>
                    <section className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label="Delivery address">
                        <div className="flex items-start gap-3">
                            <MapPin size={20} className="mt-0.5 shrink-0 text-emerald-700" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">Delivery address</p>
                                {isAddressLoading ? <p className="mt-1 text-sm text-slate-500">Loading saved address…</p> : defaultAddress ? <p className="mt-1 text-sm text-slate-600">{[
                                    defaultAddress.area,
                                    [defaultAddress.flatHouseNumber, defaultAddress.floor, defaultAddress.street, defaultAddress.landmark, defaultAddress.city && defaultAddress.pincode ? `${defaultAddress.city}-${defaultAddress.pincode}` : defaultAddress.city || defaultAddress.pincode].filter(Boolean).join(", "),
                                ].filter(Boolean).join(" · ")}</p> : <p className="mt-1 text-sm text-slate-500">No saved address.</p>}
                            </div>
                            <button type="button" className="shrink-0 text-sm font-semibold text-emerald-700" onClick={() => navigate("/dashboard/addresses", { state: { returnToCheckout: true, checkoutState: location.state || {} } })}>Change</button>
                        </div>
                    </section>
                    <div className="grid gap-3">
                        {/* COD Method */}
                        <button type="button" aria-expanded={optionOpen === "cash"} className={`w-full rounded-2xl border p-4 text-left transition ${selectedPaymentMethod === "cash" ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"}`} onClick={() => {
                                    if (!canPlaceOrder) return toast.error(availability?.message || "Ordering is currently unavailable.");
                                    setOptionOpen(optionOpen === "cash" ? "" : "cash");
                                    setSelectedPaymentMethod(optionOpen === "cash" ? "" : "cash");
                                }}>
                            <div className="flex items-center gap-3">
                                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-800"><Banknote size={22}/></span>
                                <span className="min-w-0 flex-1"><span className="block text-base font-bold text-slate-900">Cash on Delivery</span><span className="mt-1 block text-sm font-normal text-slate-500">Pay the rider when your order arrives</span></span>
                                {selectedPaymentMethod === "cash" ? <CheckCircle2 className="text-emerald-700"/> : <span className="h-5 w-5 rounded-full border-2 border-slate-300"/>}
                            </div>
                            {optionOpen === "cash" && <p className="mt-3 border-t border-emerald-100 pt-3 text-sm font-medium text-slate-600">Please keep exact change handy to help us serve you better.</p>}
                        </button>
                        {/* Razorpay Method */}
                        <button type="button" aria-expanded={optionOpen === "razorpay"} className={`w-full rounded-2xl border p-4 text-left transition ${selectedPaymentMethod === "razorpay" ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"}`} onClick={() => {
                                    if (!canPlaceOrder) return toast.error(availability?.message || "Ordering is currently unavailable.");
                                    setOptionOpen(optionOpen === "razorpay" ? "" : "razorpay");
                                    setSelectedPaymentMethod(optionOpen === "razorpay" ? "" : "razorpay");
                                }}>
                            <div className="flex items-center gap-3">
                                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-800"><CreditCard size={22}/></span>
                                <span className="min-w-0 flex-1"><span className="block text-base font-bold text-slate-900">Pay online</span><span className="mt-1 block text-sm font-normal text-slate-500">Cards, UPI, netbanking and more</span></span>
                                {selectedPaymentMethod === "razorpay" ? <CheckCircle2 className="text-emerald-700"/> : <span className="h-5 w-5 rounded-full border-2 border-slate-300"/>}
                            </div>
                            {optionOpen === "razorpay" && <p className="mt-3 border-t border-emerald-100 pt-3 text-sm font-medium text-slate-600">Continue securely with Razorpay.</p>}
                        </button>
                    </div>

                </div>


                {/* Right Section - Cart Summary */}
                <div className="hidden lg:block xl:block w-1/3 bg-white h-[80vh] py-5 border border-gray-200">
                    {/* address */}
                    <div className="px-6 pb-5">
                        <h3 className="text-xl text-[#676767] font-semibold">Delivery Address</h3>
                        <p className="text-sm text-gray-400">
                            <span>{[
                                defaultAddress?.area,
                                [defaultAddress?.street, defaultAddress?.flatHouseNumber, defaultAddress?.floor, defaultAddress?.landmark, defaultAddress?.city && defaultAddress?.pincode ? `${defaultAddress.city}-${defaultAddress.pincode}` : defaultAddress?.city || defaultAddress?.pincode].filter(Boolean).join(", "),
                            ].filter(Boolean).join(" • ")}
                            </span>
                        </p>
                    </div>
                    {/* Items */}
                    <div className="bg-[#FBFBFB] flex justify-between px-6 py-5 border border-gray-200">
                        <p className="text-[#676767] font-bold text-sm">My Chart</p>
                        <p className="text-[#676767] font-semibold text-sm">{totalItems} Items</p>
                    </div>
                    <div className="h-[50vh] overflow-y-auto">
                        {
                            cartItem.map((item, index) => (
                                <div key={index} className="px-7 py-5 border border-gray-200 flex items-center gap-5">
                                    <p>{item.quantity}</p>
                                    <img src={item.productId.image[0]} alt="" className="w-15 h-15" />
                                    <div className="text-xs flex flex-col gap-1">
                                        <p className="line-clamp-1">{item.productId.name}</p>
                                        <div>
                                            <p>{item.productId.unit}</p>
                                            {
                                                item?.productId.discount > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[11px] font-bold line-through text-gray-500">
                                                            {item?.sellingType === "loose" && "MRP "}&#8377;{item?.sellingType === "loose" ? getLooseBaseUnitPrice(item?.productId) : item?.productId.price}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-gray-700">
                                                            &#8377;{item?.sellingType === "loose" ? getLooseDiscountedUnitPrice(item?.productId).toFixed(2) : discountedUnitPrice(item?.productId.price, item?.productId.discount).toFixed(2)}{item?.sellingType === "loose" ? ` / ${getLoosePriceUnitLabel(item?.productId)}` : ""}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] font-bold text-gray-700">&#8377;{item?.sellingType === "loose" ? getLooseBaseUnitPrice(item?.productId) : item?.productId.price}{item?.sellingType === "loose" ? ` / ${getLoosePriceUnitLabel(item?.productId)}` : ""}</span>
                                                )
                                            }
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                    <button
                        className={`w-full text-white py-3 text-lg font-bold rounded-lg ${selectedPaymentMethod === "" || !canPlaceOrder
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-[#4A842C] cursor-pointer"
                            }`}
                        disabled={selectedPaymentMethod === "" || !canPlaceOrder}
                        onClick={() => setIsConfirmationScreenActive(true)}
                    >
                        Pay Now
                    </button>
                </div>
            </div>
            <button
                className={`w-full fixed lg:hidden xl:hidden bottom-0 text-white py-3 text-lg font-bold ${selectedPaymentMethod === "" || !canPlaceOrder
                    ? "bg-[#CCCCCC] cursor-not-allowed"
                    : "bg-[#4A842C] cursor-pointer"
                    }`}
                disabled={selectedPaymentMethod === "" || !canPlaceOrder}
                onClick={() => setIsConfirmationScreenActive(true)}
            >
                Pay Now
            </button>

            {isConfirmationScreenActive && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 px-4">
                    {loading ? (
                        // Loader
                        <div className="flex items-center justify-center bg-white p-6 rounded-lg shadow-lg w-40 h-28">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-500"></div>
                        </div>
                    ) : (
                        // Confirmation Modal
                        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm text-center">
                            <h2 className="text-lg font-semibold mb-3 text-gray-800">
                                Confirm Your Order
                            </h2>
                            <p className="text-gray-600 mb-5">
                                Ready to place your order?
                            </p>
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => setIsConfirmationScreenActive(false)}
                                    className="px-5 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePayNow}
                                    className="px-5 py-2 bg-[#4A842C] text-white rounded-md hover:bg-[#415c34] transition-all"
                                >
                                    Confirm Order
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </>
    );
}

export default CheckOut;
