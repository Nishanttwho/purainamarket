import mongoose from "mongoose";

const cartProductSchema = new mongoose.Schema({
    productId : {
        type : mongoose.Schema.ObjectId,
        ref : 'product'
    },
    quantity : {
        type : Number,
        default : 1
    },
    sellingType : {
        type : String,
        enum : ["packed", "loose"],
        default : "packed"
    },
    purchaseMode : {
        type : String,
        enum : ["weight", "amount", null],
        default : null
    },
    selectedWeightKg : { type : Number, default : null, min : 0 },
    amount : { type : Number, default : null, min : 0 },
    // Snapshot the payable line amount so a product price change does not
    // silently alter an in-progress cart or order.
    linePrice : { type : Number, default : null, min : 0 },
    userId : {
        type : mongoose.Schema.ObjectId,
        ref : "User"
    }
},{
    timestamps : true
})

const CartProductModel = mongoose.model('cartProduct',cartProductSchema)

export default CartProductModel
