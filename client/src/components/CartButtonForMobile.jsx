/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { HiOutlineShoppingCart } from "react-icons/hi";
import { useSelector } from "react-redux";
import { FaCaretRight } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

function CartButtonForMobile({setIsCartButtonForMobile, isCartMenuOpen}) {

    const cartItem = useSelector((state) => state.cartItem.cart);
    const navigate = useNavigate();

    const [totalItems, setTotalItems] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);

    useEffect(() => {
        let itemsCount = 0;
        let priceCount = 0;

        // for (const item of cartItem) {
        //     itemsCount += item.quantity;
        //     const discountedPrice = item.productId.price * (1 - item.productId.discount / 100);
        //     priceCount += discountedPrice * item.quantity;
        // }
        itemsCount = cartItem.reduce((prev, curr) => {
            return prev + (curr.sellingType === "loose" ? 1 : curr.quantity);
        }, 0)
        priceCount = parseFloat(cartItem.reduce((prev, curr) => {
            return prev + (curr.linePrice ?? curr.productId.price * (1 - curr.productId.discount / 100)) * (curr.sellingType === "loose" ? 1 : curr.quantity);
        }, 0).toFixed(2));

        setTotalItems(itemsCount);
        setTotalPrice(priceCount);
    }, [cartItem]);
    return (

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
    )
}

export default CartButtonForMobile
