import UserModel from "../models/user.model.js"
import CartProductModel from "../models/cartProduct.model.js"
import ProductModel from "../models/product.model.js"
import { getLooseDiscountedPricePerKg, getLoosePricePerKg, getPresetWeightsGrams } from "../utils/loosePricing.js";

const isDatabaseObjectId = value => /^[a-f\d]{24}$/i.test(String(value || ""));
const money = value => Number(Number(value || 0).toFixed(2));

const looseLineDetails = (product, purchaseMode, selectedWeightKg, amount) => {
    const config = product.looseConfig || {};
    const pricePerKg = getLoosePricePerKg(product);
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) throw new Error("This loose product has no valid price per kg.");

    if (purchaseMode === "weight") {
        const weight = Number(selectedWeightKg);
        if (!Number.isFinite(weight) || weight <= 0) throw new Error("Choose a valid weight.");
        const isPreset = getPresetWeightsGrams(config).some(value => Math.abs(value - weight * 1000) < 0.5);
        if (!isPreset && !config.allowCustomWeight) throw new Error("Custom weights are not available for this product.");
        const discountedRate = getLooseDiscountedPricePerKg(product);
        return { purchaseMode, selectedWeightKg: weight, amount: null, linePrice: money(weight * discountedRate) };
    }

    if (purchaseMode === "amount") {
        const spend = Number(amount);
        if (!config.allowAmount) throw new Error("Amount-based purchases are not available for this product.");
        if (!Number.isFinite(spend) || spend <= 0) throw new Error("Enter a valid amount.");
        // The derived weight is retained for inventory fulfilment only; the UI
        // deliberately renders only the amount for this selection.
        return { purchaseMode, selectedWeightKg: Number((spend / getLooseDiscountedPricePerKg(product)).toFixed(3)), amount: spend, linePrice: Number(spend.toFixed(2)) };
    }
    throw new Error("Choose a weight or amount for this loose product.");
};

export const addToCartItemController = async (req, res) => {
    try {
        const userId = req.userId
        const { productId, purchaseMode, selectedWeightKg, amount } = req.body

        if(!productId) {
            return res.status(400).json({
                message: "Product ID is required.",
                error: true,
                success: false,
            })
        }

        const product = await ProductModel.findById(productId)
        if (!product) {
            return res.status(404).json({ message: "Product not found.", error: true, success: false })
        }

        const isLoose = product.sellingType === "loose";
        const details = isLoose
            ? looseLineDetails(product, purchaseMode, selectedWeightKg, amount)
            : { purchaseMode: null, selectedWeightKg: null, amount: null, linePrice: null };

        if (isLoose && product.stock !== null && details.selectedWeightKg > product.stock) {
            return res.status(400).json({ message: `Only ${product.stock} kg available in stock.`, error: true, success: false })
        }

        const cartQuery = isLoose
            ? { userId, productId, purchaseMode: details.purchaseMode, selectedWeightKg: details.selectedWeightKg, amount: details.amount }
            : { userId, productId, sellingType: "packed" };
        const checkItemCart = await CartProductModel.findOne(cartQuery)

        if(checkItemCart) {
            return res.status(400).json({
                message: "Product already exists in cart.",
                error: true,
                success: false,
            })
        }

        const cartItem = new CartProductModel({
            productId,
            quantity: 1,
            userId,
            sellingType: isLoose ? "loose" : "packed",
            ...details
        }) 

        const save = await cartItem.save()

        // update cart in user model
        const updateUserCart = await UserModel.updateOne({_id: userId}, {
            $push: {shopping_cart: productId}
        })

        return res.status(200).json({
            message: "Product added to cart successfully.",
            error: false,
            success: true,
            data: save,
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        })
    }
}

export const getCartItemsController = async (req, res) => {
    try {
        const userId = req.userId

        const cartItems = await CartProductModel.find({userId}).populate("productId")
        const normalizedCartItems = cartItems.map((cartItem) => {
            const item = typeof cartItem.toObject === "function" ? cartItem.toObject() : { ...cartItem };
            const product = item.productId;
            if (item.sellingType !== "loose") {
                item.linePrice = null;
            } else if (item.purchaseMode === "weight" && product) {
                const rate = getLooseDiscountedPricePerKg(product);
                item.linePrice = money(Number(item.selectedWeightKg) * rate);
            } else if (item.purchaseMode === "amount") {
                item.linePrice = money(item.amount);
            }
            return item;
        });

        return res.status(200).json({
            message: "Cart items fetched successfully.",
            error: false,
            success: true,
            data: normalizedCartItems,
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        })
    }
}

export const updateCartItemQuantityController = async (req, res) => {
    try {
        const userId = req.userId;
        const { _id, quantity } = req.body;

        if (!_id || quantity === undefined) {
            return res.status(400).json({
                message: "All fields are required.",
                error: true,
                success: false,
            });
        }

        if (!isDatabaseObjectId(_id)) {
            return res.status(400).json({ message: "Cart item ID must be a valid database ID.", error: true, success: false });
        }

        // Find the cart item and populate the product details
        const cartItem = await CartProductModel.findOne({ _id, userId }).populate('productId');
        if (!cartItem) {
            return res.status(404).json({
                message: "Cart item not found.",
                error: true,
                success: false,
            });
        }

        const product = cartItem.productId;
        if (!product) {
            return res.status(404).json({
                message: "Product not found.",
                error: true,
                success: false,
            });
        }

        if (cartItem.sellingType === "loose") {
            return res.status(400).json({
                message: "Edit a loose item by selecting its weight or amount again.",
                error: true,
                success: false
            });
        }

        if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
            return res.status(400).json({ message: "Quantity must be a positive whole number.", error: true, success: false });
        }

        // Check if requested quantity is greater than available stock
        if (product.stock !== null && Number(quantity) > product.stock) {
            return res.status(400).json({
                message: `Only ${product.stock} items available in stock.`,
                error: true,
                success: false,
            });
        }

        // Update cart item quantity
        const updateCartItem = await CartProductModel.updateOne(
            { _id, userId },
            { quantity: Number(quantity) }
        );

        return res.status(200).json({
            message: "Cart item quantity updated successfully.",
            error: false,
            success: true,
            data: updateCartItem,
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};


export const deleteItemFromCartController = async (req, res) => {
    try {
        const userId = req.userId 
        const { _id } = req.body 
        
        if(!userId) {
            return res.status(401).json({
                message : "Please login to access this endpoint.",
                error : true,
                success : false
            })
        }

        if(!_id){
            return res.status(400).json({
                message : "Product ID is required.",
                error : true,
                success : false
            })
        }

        if (!isDatabaseObjectId(_id)) {
            return res.status(400).json({ message: "Cart item ID must be a valid database ID.", error: true, success: false });
        }

        const deleteCartItem  = await CartProductModel.deleteOne({ _id, userId })

        return res.json({
            message : "Product deleted from cart successfully.",
            error : false,
            success : true,
            data : deleteCartItem
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        })
    }
}

export const emptyCartController = async (req, res) => {
    try {
        const userId = req.userId 
        
        if(!userId) {
            return res.status(401).json({
                message : "Please login to access this endpoint.",
                error : true,
                success : false
            })
        }

        const emptyCart = await CartProductModel.deleteMany({ userId })

        return res.json({
            message : "Cart emptied successfully.",
            error : false,
            success : true,
            data : emptyCart
        })

    } catch (error) {
        return res.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        })
    }
}
