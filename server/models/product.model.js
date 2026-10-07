import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name : {
        type : String,
    },
    image : {
        type : Array,
        default : []
    },
    category : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'category'
        }
    ],
    subCategory : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'subCategory'
        }
    ],
    unit : {
        type : String,
        default : ""
    },
    stock : {
        type : Number,
        default : null
    },
    price : {
        type : Number,
        default : null
    },
    // Existing products remain packed products. Loose products retain a legacy
    // per-kg rate and may also define a selected price basis in priceUnitGrams.
    sellingType : {
        type : String,
        enum : ["packed", "loose"],
        default : "packed"
    },
    pricePerKg : {
        type : Number,
        default : null,
        min : 0
    },
    // Price entered for the loose product's selected selling basis (in grams).
    // Missing values keep older products on the legacy per-kg rate.
    priceUnitGrams : {
        type : Number,
        default : null,
        enum : [null, 100, 250, 500, 1000]
    },
    looseConfig : {
        presetWeightsKg : { type : [Number], default : [0.25, 0.5, 1, 2, 5] },
        allowCustomWeight : { type : Boolean, default : true },
        allowAmount : { type : Boolean, default : true },
        presetAmounts : { type : [Number], default : [10, 50, 100] }
    },
    discount : {
        type : Number,
        default : null
    },
    description : {
        type : String,
        default : ""
    },
    more_details : {
        type : Object,
        default : {}
    },
    publish : {
        type : Boolean,
        default : true
    }
},{
    timestamps : true
})

//create a text index
productSchema.index(
    { name: "text", description: "text" },
    { weights: { name: 10, description: 5 } }
);
const ProductModel = mongoose.model('product',productSchema)

export default ProductModel
