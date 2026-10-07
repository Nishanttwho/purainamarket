import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import summaryApi from "../common/summaryApi";
import Axios from "../utils/Axios";
import { useEffect, useState } from "react";
import { FaArrowLeftLong } from "react-icons/fa6";
import { IoMdCopy } from "react-icons/io";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { formatOrderItemQuantity, getLineTotal, printOrderReceipt } from "../utils/printOrderReceipt";
import { getLoosePricePerKg } from "../utils/loosePricing";

function OrderDetails() {
    const navigate = useNavigate();
    const { orderId } = useParams();

    const [totalAmountWithoutDiscount, setTotalAmountWithoutDiscount] = useState(0)
    const[totalAmountWithDiscount, setTotalAmountWithDiscount] = useState(0)
    const [orderData, setOrderData] = useState(null);
    const [deliveryTime, setDeliveryTime] = useState(null);
    const [loading, setLoading] = useState(false);
    const changeDateFormat = (timestamp) => {
        if (!timestamp) return "Invalid Date"; // Handle undefined/null cases
    
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return "Invalid Date"; // Handle invalid date values
    
        return format(date, "eee, dd MMM''yy, h:mm a");
    };
    

    function calculateDeliveryDate(createdAt, deliveryTime) {
        if (!createdAt || !deliveryTime) return "";
    
        const deliveryDate = new Date(createdAt);
        deliveryDate.setMinutes(deliveryDate.getMinutes() + deliveryTime); // Add minutes instead of days
    
        return deliveryDate.toLocaleString("en-US", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }
    
    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...summaryApi.getOrderDetailsByOrderId,
                data: { orderId }
            });

            if (response.data.success) {
                setOrderData(response.data.order[0]);
            } else {
                toast.error(response.data.message);
                setOrderData(null);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
        // console.log(orderData);
    }, []);

    function calculateTotalAmounts(itemList, storedSubtotal) {
        const totalAmountWithoutDiscount = itemList.reduce((total, item) => {
            const product = item.productId || {};
            if (item.sellingType === "loose") {
                if (item.purchaseMode === "amount") return total + (Number(item.amount) || 0);
                return total + getLoosePricePerKg(product) * (Number(item.selectedWeightKg) || 0);
            }
            return total + (Number(product.price) || 0) * (Number(item.quantity) || 0);
        }, 0);
        const calculatedSubtotal = itemList.reduce((total, item) => total + getLineTotal(item), 0);
        const totalAmountWithDiscount = storedSubtotal !== null && storedSubtotal !== undefined
            ? Number(storedSubtotal) || 0
            : calculatedSubtotal;

        setTotalAmountWithoutDiscount(totalAmountWithoutDiscount);
        setTotalAmountWithDiscount(totalAmountWithDiscount);
    }


    // Set deliveryTime when orderData is updated
    useEffect(() => {
        if (orderData?.itemList && Array.isArray(orderData.itemList)) {
            calculateTotalAmounts(orderData.itemList, orderData.subTotalAmt);
        }
        if (orderData?.createdAt && orderData?.delivery_time) {
            setDeliveryTime(calculateDeliveryDate(orderData.createdAt, orderData.delivery_time));
        }
    }, [orderData]);
    
    const additionalCharges = orderData?.otherCharge ?? Math.max(0, (Number(orderData?.totalAmt) || 0) - totalAmountWithDiscount);
    const itemCount = (orderData?.itemList || []).reduce((total, item) => total + (item.sellingType === "loose" ? 1 : Number(item.quantity) || 0), 0);
    
    return (
        <>
            {loading ? (
                <div className="flex items-center justify-center mt-[25%]">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-500"></div>
                </div>
            ) : (
                <div className="mx-3 my-10">
                    {/* Back Button */}
                    <button onClick={() => navigate(-1)} className="p-3 border border-gray-300 rounded-md">
                        <FaArrowLeftLong size={20} className="text-[#1F1F1F]" />
                    </button>
                    {orderData && <button onClick={() => printOrderReceipt(orderData)} className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-semibold"><Printer size={17} /> Print receipt</button>}
                    {/* Order summary */}
                    <div className="mt-5">
                        <p className="text-lg font-bold">Order summary</p>
                        {orderData?.order_status === "Delivered" && (
                            <p className="text-xs text-[#666666]">Arrived at {deliveryTime}</p>
                        )}
                        {(orderData?.order_status === "Pending" ||
                            orderData?.order_status === "Processing" ||
                            orderData?.order_status === "Shipped" ||
                            orderData?.order_status === "Out for Delivery") && (
                                <p className="text-xs text-[#666666]">{orderData?.order_status === "Out for Delivery" ? "Your order is out for delivery" : `Your order will arrive at ${deliveryTime}`}</p>
                            )}
                        {(orderData?.order_status === "Cancelled" || orderData?.order_status === "Returned") && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>Order has been {orderData?.order_status.toLowerCase()}.</p>{orderData?.order_status === "Cancelled" && orderData?.cancellationReason && <p className="mt-1">Reason: {orderData.cancellationReason}</p>}</div>
                        )}
                        <div className="px-4 mt-4">
                            {/* Items in order */}
                            <div>
                                <p>{itemCount} {itemCount === 1 ? "item" : "items"} in this order</p>
                                {/* Products */}
                                <div className="flex flex-col gap-3 mt-3">
                                    {
                                        orderData?.itemList.map((item, index) => (
                                            <div key={index} className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-gray-100 py-3 last:border-0">
                                                <div className="flex gap-3 items-center">
                                                    <img src={item.productId.image[0]} alt={item.productId.name} className="w-15 h-15 p-1 border border-gray-300 rounded-xl" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold line-clamp-1">{item.productId.name}</p>
                                                        <p className="text-xs text-[#666666]">{item.sellingType === "loose" ? "Loose / open" : "Packed"} · {formatOrderItemQuantity(item)}</p>
                                                    </div>
                                                </div>
                                                <p className="shrink-0 text-xs font-bold">₹{getLineTotal(item).toFixed(2)}</p>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                            {/* Breaking line */}
                            <div className="border-b-10 border-[#F5F5F5] mt-5">

                            </div>
                            {/* Bill Details */}
                            <div className="mt-5">
                                <p className="text-sm font-bold pb-5 border-b border-gray-100">Bill details</p>
                                <div className="space-y-2 mt-4">
                                    <div className="flex justify-between font-semibold">
                                        <p className="text-xs text-[#666666]">MRP</p>
                                        <p className="text-xs text-[#666666]">
                                            &#8377;{totalAmountWithoutDiscount}
                                        </p>

                                    </div>
                                    <>
                                        {
                                            totalAmountWithoutDiscount - totalAmountWithDiscount > 0 && (
                                                <div className="flex justify-between font-semibold">
                                                    <p className="text-xs text-[#256FEF]">Product discount</p>
                                                    <p className="text-xs text-[#256FEF]">
                                                        -&#8377;{(totalAmountWithoutDiscount - totalAmountWithDiscount).toFixed(2)}
                                                    </p>
                                                </div>
                                            )
                                        }
                                    </>
                                    <div className="flex justify-between font-semibold">
                                        <p className="text-xs text-[#666666]">Item total</p>
                                        <p className="text-xs text-[#666666]">&#8377;{totalAmountWithDiscount.toFixed(2)}</p>
                                    </div>
                                    <div className="flex justify-between font-semibold"><p className="text-xs text-[#666666]">Delivery charge{orderData?.deliveryAreaName ? ` · ${orderData.deliveryAreaName}` : ""}</p><p className="text-xs text-[#666666]">₹{Number(orderData?.deliveryCharge ?? additionalCharges).toFixed(2)}</p></div>
                                    {orderData?.deliverySavings > 0 && <div className="flex justify-between font-semibold text-blue-600"><p className="text-xs">Free delivery savings</p><p className="text-xs">−₹{Number(orderData.deliverySavings).toFixed(2)}</p></div>}
                                    <div className="flex justify-between font-semibold"><p className="text-xs text-[#666666]">Handling charge</p><p className="text-xs text-[#666666]">₹{Number(orderData?.handlingCharge ?? Math.max(0, additionalCharges - (Number(orderData?.deliveryCharge) || 0))).toFixed(2)}</p></div>
                                    {orderData?.delivery_time && <p className="text-xs text-gray-500">Estimated delivery: about {orderData.delivery_time} minutes</p>}
                                    <div className="flex justify-between font-semibold">
                                        <p className="text-sm">Bill total</p>
                                        <p className="text-sm ">&#8377;{orderData?.totalAmt}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Breaking line */}
                            <div className="border-b-10 border-[#F5F5F5] mt-5">

                            </div>
                            {/* Order details */}
                            <div className="mt-5">
                                <p className="text-sm font-bold pb-5 border-b border-gray-100">Order details</p>
                                {orderData?.userId && (
                                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-[#666666]">Customer</p>
                                        <p className="text-sm font-semibold text-[#282727]">{orderData.userId.name || "Customer"}</p>
                                        {orderData.userId.mobile && <p className="text-sm text-[#282727]">{orderData.userId.mobile}</p>}
                                        {orderData.userId.email && <p className="break-all text-sm text-[#282727]">{orderData.userId.email}</p>}
                                    </div>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                    <div>
                                        <p className="text-xs text-[#666666]">Order ID</p>
                                        <div className="flex gap-1 text-[#282727]">
                                            <p className="text-sm ">{orderData?.orderId}</p>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(orderData?.orderId);
                                                    toast.success("Order ID copied!");
                                                }}
                                                className="text-sm"
                                            >
                                                <IoMdCopy />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div>
                                        <p className="text-xs text-[#666666]">Payment</p>
                                        <p className="text-sm text-[#282727]">{orderData?.payment_type}</p>
                                        <p className="text-xs text-[#666666]">{orderData?.paymentStatus || (orderData?.paymentId ? "Paid" : orderData?.payment_type === "Cash on Delivery" ? "COD Pending" : "Pending")}</p>
                                    </div>
                                </div>
                                {orderData?.riderId && <div className="mt-2"><p className="text-xs text-[#666666]">Delivery rider</p><p className="text-sm text-[#282727]">{orderData.riderId.name || "Rider"}{orderData.riderId.mobile ? ` · ${orderData.riderId.mobile}` : ""}</p>{orderData.acceptedAt && <p className="text-xs text-[#666666]">Accepted {changeDateFormat(orderData.acceptedAt)}</p>}{orderData.deliveredAt && <p className="text-xs text-[#666666]">Delivered {changeDateFormat(orderData.deliveredAt)}</p>}</div>}
                                <div className="mt-2 flex items-center gap-2">
                                    <div>
                                        <p className="text-xs text-[#666666]">Deliver to</p>
                                        <p className="text-sm text-[#282727]">
                                            {[
                                                orderData?.delivery_address?.street, 
                                                orderData?.delivery_address?.flatHouseNumber, 
                                                orderData?.delivery_address?.floor, 
                                                orderData?.delivery_address?.landmark, 
                                                orderData?.delivery_address?.city && orderData?.delivery_address?.pincode 
                                                    ? `${orderData.delivery_address.city}-${orderData.delivery_address.pincode}` 
                                                    : null
                                            ]
                                                .filter(Boolean)
                                                .join(", ")}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div>
                                        <p className="text-xs text-[#666666]">Order placed</p>
                                        <p className="text-sm text-[#282727]">Placed on {changeDateFormat(orderData?.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default OrderDetails;
