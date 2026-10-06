/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/rules-of-hooks */
import { createContext, useContext, useEffect, useRef } from "react";
import { handleAddItem, setCartItems } from "../store/cartProductSlice";
import summaryApi from "../common/summaryApi";
import { useDispatch } from "react-redux";
import Axios from "../utils/Axios";
import AxiosToastError from "../utils/AxiosToastError";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

const CartContext = createContext();
const cartItemQueues = new Map();

let optimisticCartId = 0;

const serializeCartAction = (key, action) => {
    const previous = cartItemQueues.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(action);
    cartItemQueues.set(key, current);
    return current.finally(() => {
        if (cartItemQueues.get(key) === current) cartItemQueues.delete(key);
    });
};

export const CartProvider = ({ children }) => {

    const dispatch = useDispatch()
    const latestCart = useSelector(state => state.cartItem.cart);
    const latestCartRef = useRef(latestCart);
    latestCartRef.current = latestCart;
    const replaceCart = (items) => {
        latestCartRef.current = items;
        dispatch(setCartItems(items));
    };

    const fetchCartItem = async () => {
        try {
            const response = await Axios({
                ...summaryApi.getCartItems,
            })
            // console.log("response: ", response);

            if (response.data.success) {
                latestCartRef.current = response.data.data;
                dispatch(handleAddItem(response.data.data))
            }

        } catch (error) {
            console.log(error);
        }
    }

    const addCartItem = async (product, payload = {}) => serializeCartAction(`product:${product._id}`, async () => {
        const currentCart = latestCartRef.current;
        const isLoose = product.sellingType === "loose";
        const existingItem = !isLoose && currentCart.find(item => String(item.productId?._id || item.productId) === String(product._id) && item.sellingType !== "loose");
        if (existingItem) return existingItem;
        const optimisticId = `optimistic-${product._id}-${++optimisticCartId}`;
        const price = Number(isLoose ? product.pricePerKg ?? product.price : product.price) || 0;
        const linePrice = isLoose
            ? Number((payload.purchaseMode === "amount" ? payload.amount : Number(payload.selectedWeightKg) * price).toFixed(2))
            : Number((price * (1 - (Number(product.discount) || 0) / 100)).toFixed(2));
        const optimisticItem = {
            _id: optimisticId,
            productId: product,
            quantity: 1,
            sellingType: isLoose ? "loose" : "packed",
            purchaseMode: payload.purchaseMode || null,
            selectedWeightKg: payload.selectedWeightKg ?? null,
            amount: payload.amount ?? null,
            linePrice,
            optimistic: true
        };
        replaceCart([...currentCart, optimisticItem]);
        try {
            const response = await Axios({ ...summaryApi.addToCart, data: { productId: product._id, ...payload } });
            if (!response.data.success) throw new Error(response.data.message || "Could not add product to cart.");
            replaceCart(latestCartRef.current.map(item => item._id === optimisticId
                ? { ...response.data.data, productId: product }
                : item));
            return response.data.data;
        } catch (error) {
            replaceCart(latestCartRef.current.filter(item => item._id !== optimisticId));
            AxiosToastError(error);
            return null;
        }
    });

    const updateCartItem = async (id, quantity) => serializeCartAction(`item:${id}`, async () => {
        const previousCart = [...latestCartRef.current];
        const target = previousCart.find(item => item._id === id);
        if (!target) return;
        const optimisticCart = quantity < 1
            ? previousCart.filter(item => item._id !== id)
            : previousCart.map(item => item._id === id ? { ...item, quantity } : item);
        replaceCart(optimisticCart);
        try {
            if (quantity < 1) {
                const response = await Axios({ ...summaryApi.deleteItemFromCart, data: { _id: id } });
                if (response.data.success === false) throw new Error(response.data.message || "Could not remove product from cart.");
                return response.data.data;
            }
            const response = await Axios({ ...summaryApi.updateCartItemQuantity, data: { _id: id, quantity } });
            if (!response.data.success) throw new Error(response.data.message || "Could not update product quantity.");
            return response.data.data;
        } catch (error) {
            const restoredCart = [...latestCartRef.current];
            const currentIndex = restoredCart.findIndex(item => item._id === id);
            const previousIndex = previousCart.findIndex(item => item._id === id);
            if (currentIndex >= 0) restoredCart[currentIndex] = target;
            else restoredCart.splice(Math.min(previousIndex, restoredCart.length), 0, target);
            replaceCart(restoredCart);
            AxiosToastError(error);
            return null;
        }
    });

    const deleteCartItem = async (id) => updateCartItem(id, 0);

    const clearTheCart = async () => {
        try {
            const response = await Axios({
                ...summaryApi.clearTheCart
            })

            if(response.data.success) {
                // toast.success(response.data.message)
                fetchCartItem()
            } else {
                toast.error(response.data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        fetchCartItem();
    }, []);

    return (
        <CartContext.Provider value={{
            fetchCartItem,
            addCartItem,
            updateCartItem,
            deleteCartItem,
            clearTheCart
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const userCart = () => useContext(CartContext)
