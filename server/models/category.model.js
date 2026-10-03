import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name : {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    handlingFee: {
        type: Number,
        default: 0,
        min: 0
    },
    handlingFeeEnabled: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

const CategoryModel = mongoose.model("category", categorySchema)

export default CategoryModel
