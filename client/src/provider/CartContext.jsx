/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/rules-of-hooks */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { setCartItems } from "../store/cartProductSlice";
import summaryApi from "../common/summaryApi";
import { useDispatch, useSelector } from "react-redux";
import Axios from "../utils/Axios";
import AxiosToastError from "../utils/AxiosToastError";
import toast from "react-hot-toast";
import { getCartItemTotal } from "../utils/cartPricing";

const CartContext = createContext();
const cartItemQueues = new Map();
let optimisticCartId = 0;

const isDatabaseId = (id) => /^[a-f\d]{24}$/i.test(String(id || ""));
const productIdOf = (item) => String(item?.productId?._id || item?.productId || "");
const normalizeCartItem = (item) => item?.sellingType === "loose" ? item : { ...item, linePrice: null };
const normalizeCart = (items = []) => items.filter(item => isDatabaseId(item?._id)).map(normalizeCartItem);

const serializeCartAction = (key, action) => {
    const previous = cartItemQueues.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(action);
    cartItemQueues.set(key, current);
    return current.finally(() => {
        if (cartItemQueues.get(key) === current) cartItemQueues.delete(key);
    });
};

export const CartProvider = ({ children }) => {
    const dispatch = useDispatch();
    const latestCart = useSelector(state => state.cartItem.cart);
    const userId = useSelector(state => String(state.user?._id || ""));
    const latestCartRef = useRef(latestCart);
    const confirmedCartRef = useRef([]);
    const cartRevisionRef = useRef(0);
    const productRevisionRef = useRef(new Map());
    const pendingByUserRef = useRef(new Map());
    const pendingActionsRef = useRef(new Map());
    const cartFetchSequenceRef = useRef(0);
    const userIdRef = useRef(userId);
    const [isCartLoading, setIsCartLoading] = useState(true);
    const [cartSyncVersion, setCartSyncVersion] = useState(0);
    const [pendingCounts, setPendingCounts] = useState({});
    const [pendingActionCounts, setPendingActionCounts] = useState({});
    userIdRef.current = userId;
    latestCartRef.current = latestCart;

    const replaceCart = (items) => {
        latestCartRef.current = items;
        dispatch(setCartItems(items));
    };

    const bumpRevision = (productId) => {
        cartRevisionRef.current += 1;
        const revision = (productRevisionRef.current.get(productId) || 0) + 1;
        productRevisionRef.current.set(productId, revision);
        return revision;
    };

    const markCartSynced = () => setCartSyncVersion(version => version + 1);

    const upsertConfirmedItem = (item) => {
        confirmedCartRef.current = [
            ...confirmedCartRef.current.filter(existing => String(existing._id) !== String(item._id)),
            normalizeCartItem(item)
        ];
    };

    const removeConfirmedItem = (id) => {
        confirmedCartRef.current = confirmedCartRef.current.filter(item => String(item._id) !== String(id));
    };

    const restoreConfirmedItem = (id) => {
        const current = latestCartRef.current;
        const oldIndex = current.findIndex(item => String(item._id) === String(id));
        const confirmed = confirmedCartRef.current.find(item => String(item._id) === String(id));
        const withoutItem = current.filter(item => String(item._id) !== String(id));
        if (confirmed) withoutItem.splice(Math.max(0, Math.min(oldIndex < 0 ? withoutItem.length : oldIndex, withoutItem.length)), 0, confirmed);
        replaceCart(withoutItem);
    };

    const beginRequest = (owner) => {
        const count = (pendingByUserRef.current.get(owner) || 0) + 1;
        pendingByUserRef.current.set(owner, count);
        setPendingCounts(current => ({ ...current, [owner]: count }));
    };
    const beginAction = (owner) => {
        const count = (pendingActionsRef.current.get(owner) || 0) + 1;
        pendingActionsRef.current.set(owner, count);
        setPendingActionCounts(current => ({ ...current, [owner]: count }));
    };
    const endAction = (owner) => {
        const remaining = Math.max(0, (pendingActionsRef.current.get(owner) || 0) - 1);
        if (remaining) pendingActionsRef.current.set(owner, remaining);
        else pendingActionsRef.current.delete(owner);
        setPendingActionCounts(current => {
            const next = { ...current };
            if (remaining) next[owner] = remaining;
            else delete next[owner];
            return next;
        });
    };
    const endRequest = (owner) => {
        const remaining = Math.max(0, (pendingByUserRef.current.get(owner) || 0) - 1);
        if (remaining) pendingByUserRef.current.set(owner, remaining);
        else pendingByUserRef.current.delete(owner);
        setPendingCounts(current => {
            const next = { ...current };
            if (remaining) next[owner] = remaining;
            else delete next[owner];
            return next;
        });
    };

    const fetchCartItem = async () => {
        const owner = userIdRef.current;
        if (!owner) return [];
        const sequence = ++cartFetchSequenceRef.current;
        const revisionAtStart = cartRevisionRef.current;
        try {
            const response = await Axios({ ...summaryApi.getCartItems });
            const canReconcile = owner === userIdRef.current
                && sequence === cartFetchSequenceRef.current
                && revisionAtStart === cartRevisionRef.current
                && (pendingByUserRef.current.get(owner) || 0) === 0
                && (pendingActionsRef.current.get(owner) || 0) === 0;
            if (response.data.success && canReconcile) {
                const cart = normalizeCart(response.data.data || []);
                confirmedCartRef.current = cart;
                replaceCart(cart);
                markCartSynced();
                return cart;
            }
            return null;
        } catch (error) {
            console.log(error);
            return null;
        } finally {
            if (sequence === cartFetchSequenceRef.current && owner === userIdRef.current) setIsCartLoading(false);
        }
    };

    const addCartItem = async (product, payload = {}) => {
        const productId = String(product?._id || "");
        const owner = userIdRef.current;
        if (!productId || !owner) return null;
        const isLoose = product.sellingType === "loose";
        const sameSelection = (item) => productIdOf(item) === productId && (isLoose
            ? item.sellingType === "loose"
                && item.purchaseMode === payload.purchaseMode
                && Number(item.selectedWeightKg || 0) === Number(payload.selectedWeightKg || 0)
                && Number(item.amount || 0) === Number(payload.amount || 0)
            : item.sellingType !== "loose");

        const existingItem = latestCartRef.current.find(sameSelection);
        if (existingItem) return existingItem;

        const optimisticId = `optimistic-${productId}-${++optimisticCartId}`;
        const optimisticItem = {
            _id: optimisticId,
            productId: product,
            quantity: 1,
            sellingType: isLoose ? "loose" : "packed",
            purchaseMode: payload.purchaseMode || null,
            selectedWeightKg: payload.selectedWeightKg ?? null,
            amount: payload.amount ?? null,
            linePrice: null,
            optimistic: true
        };
        optimisticItem.linePrice = isLoose ? getCartItemTotal(optimisticItem) : null;
        bumpRevision(productId);
        replaceCart([...latestCartRef.current, optimisticItem]);

        beginAction(owner);
        return serializeCartAction(`user:${owner}:product:${productId}`, async () => {
            if (owner !== userIdRef.current) return null;
            const otherExistingItem = latestCartRef.current.find(item => item._id !== optimisticId && sameSelection(item));
            if (otherExistingItem) {
                replaceCart(latestCartRef.current.filter(item => item._id !== optimisticId));
                return otherExistingItem;
            }

            let response;
            let requestError;
            beginRequest(owner);
            try {
                response = await Axios({ ...summaryApi.addToCart, data: { productId, ...payload } });
            } catch (error) {
                requestError = error;
            } finally {
                endRequest(owner);
            }
            if (owner !== userIdRef.current) return null;

            const savedItem = response?.data?.data;
            if (requestError || !response?.data?.success || !isDatabaseId(savedItem?._id)) {
                replaceCart(latestCartRef.current.filter(item => item._id !== optimisticId));
                if (requestError) AxiosToastError(requestError);
                else toast.error(response?.data?.message || "The server returned an invalid cart item.");
                return null;
            }

            const canonicalItem = normalizeCartItem({
                ...savedItem,
                productId: product,
                linePrice: isLoose ? getCartItemTotal({ ...optimisticItem, ...savedItem, productId: product }) : null
            });
            upsertConfirmedItem({ ...canonicalItem, quantity: 1 });
            const currentOptimistic = latestCartRef.current.find(item => item._id === optimisticId);
            if (!currentOptimistic) {
                beginRequest(owner);
                try {
                    if (!isDatabaseId(savedItem._id)) throw new Error("Cart item is not ready to remove.");
                    const deleteResponse = await Axios({ ...summaryApi.deleteItemFromCart, data: { _id: String(savedItem._id) } });
                    if (deleteResponse.data?.success === false) throw new Error(deleteResponse.data.message || "Could not remove product from cart.");
                    removeConfirmedItem(savedItem._id);
                    markCartSynced();
                } catch (error) {
                    replaceCart([...latestCartRef.current, canonicalItem]);
                    AxiosToastError(error);
                } finally {
                    endRequest(owner);
                }
                return null;
            }

            const desiredQuantity = isLoose ? 1 : Math.max(1, Number(currentOptimistic.quantity) || 1);
            const reconciledItem = { ...canonicalItem, quantity: desiredQuantity };
            replaceCart(latestCartRef.current.map(item => item._id === optimisticId ? reconciledItem : item));
            markCartSynced();

            if (desiredQuantity > 1) {
                const revision = productRevisionRef.current.get(productId);
                beginRequest(owner);
                try {
                    if (!isDatabaseId(savedItem._id)) throw new Error("Cart item is not ready to update.");
                    const updateResponse = await Axios({
                        ...summaryApi.updateCartItemQuantity,
                        data: { _id: String(savedItem._id), quantity: desiredQuantity }
                    });
                    if (!updateResponse.data?.success) throw new Error(updateResponse.data?.message || "Could not update product quantity.");
                    upsertConfirmedItem(reconciledItem);
                    markCartSynced();
                } catch (error) {
                    if (owner === userIdRef.current && productRevisionRef.current.get(productId) === revision) {
                        const confirmed = confirmedCartRef.current.find(item => String(item._id) === String(savedItem._id));
                        if (confirmed) replaceCart(latestCartRef.current.map(item => String(item._id) === String(savedItem._id) ? confirmed : item));
                    }
                    AxiosToastError(error);
                } finally {
                    endRequest(owner);
                }
            }
            return reconciledItem;
        }).finally(() => endAction(owner));
    };

    const updateCartItem = async (id, quantity) => {
        const target = latestCartRef.current.find(item => String(item._id) === String(id));
        const owner = userIdRef.current;
        if (!target || !owner) return null;
        const productId = productIdOf(target);
        const desiredQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
        if (!target.optimistic && !isDatabaseId(id)) {
            toast.error("Cart item is not ready yet. Please try again.");
            return null;
        }

        const revision = bumpRevision(productId);
        const optimisticCart = desiredQuantity < 1
            ? latestCartRef.current.filter(item => String(item._id) !== String(id))
            : latestCartRef.current.map(item => String(item._id) === String(id) ? { ...item, quantity: desiredQuantity } : item);
        replaceCart(optimisticCart);

        // The add request reconciles temporary rows. Temporary IDs never go to an API.
        if (target.optimistic) return null;

        beginAction(owner);
        return serializeCartAction(`user:${owner}:product:${productId}`, async () => {
            if (owner !== userIdRef.current) return null;
            if (desiredQuantity > 0 && productRevisionRef.current.get(productId) !== revision) return null;
            if (!isDatabaseId(id)) return null;

            beginRequest(owner);
            try {
                if (desiredQuantity < 1) {
                    const response = await Axios({ ...summaryApi.deleteItemFromCart, data: { _id: String(id) } });
                    if (response.data?.success === false) throw new Error(response.data.message || "Could not remove product from cart.");
                    removeConfirmedItem(id);
                    markCartSynced();
                    return response.data.data;
                }

                const response = await Axios({
                    ...summaryApi.updateCartItemQuantity,
                    data: { _id: String(id), quantity: desiredQuantity }
                });
                if (!response.data?.success) throw new Error(response.data?.message || "Could not update product quantity.");
                confirmedCartRef.current = confirmedCartRef.current.map(item => String(item._id) === String(id) ? { ...item, quantity: desiredQuantity } : item);
                markCartSynced();
                return response.data.data;
            } catch (error) {
                if (owner === userIdRef.current && (desiredQuantity < 1 || productRevisionRef.current.get(productId) === revision)) restoreConfirmedItem(id);
                AxiosToastError(error);
                return null;
            } finally {
                endRequest(owner);
            }
        }).finally(() => endAction(owner));
    };

    const adjustCartItem = (id, delta) => {
        const item = latestCartRef.current.find(candidate => String(candidate._id) === String(id));
        if (!item) return null;
        return updateCartItem(id, (Number(item.quantity) || 0) + delta);
    };

    const deleteCartItem = async (id) => updateCartItem(id, 0);

    const clearTheCart = async () => {
        const owner = userIdRef.current;
        if (!owner) return;
        const previousCart = latestCartRef.current;
        bumpRevision("*");
        confirmedCartRef.current = [];
        replaceCart([]);
        beginAction(owner);
        beginRequest(owner);
        try {
            const response = await Axios({ ...summaryApi.clearTheCart });
            if (owner !== userIdRef.current) return;
            if (response.data.success) {
                markCartSynced();
            } else {
                confirmedCartRef.current = previousCart;
                replaceCart(previousCart);
                toast.error(response.data.message);
            }
        } catch (error) {
            if (owner === userIdRef.current) {
                confirmedCartRef.current = previousCart;
                replaceCart(previousCart);
            }
            toast.error(error.message);
        } finally {
            endRequest(owner);
            endAction(owner);
        }
    };

    useEffect(() => {
        cartFetchSequenceRef.current += 1;
        cartRevisionRef.current += 1;
        confirmedCartRef.current = [];
        replaceCart([]);
        if (!userId) {
            setIsCartLoading(false);
            return;
        }
        setIsCartLoading(true);
        fetchCartItem();
        // Fetches are intentionally keyed to account changes; fetchCartItem is stable for this effect's owner snapshot.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    return (
        <CartContext.Provider value={{
            fetchCartItem,
            addCartItem,
            updateCartItem,
            adjustCartItem,
            deleteCartItem,
            clearTheCart,
            isCartLoading,
            cartSyncVersion,
            isCartSyncing: Boolean(pendingCounts[userId] || pendingActionCounts[userId])
        }}>
            {children}
        </CartContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const userCart = () => useContext(CartContext);
