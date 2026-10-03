import { Router } from "express";
import { 
    addProductController, 
    deleteProductController, 
    getProductByCategoryAndSubCategory, 
    getProductByProductId, 
    getProductsByCategoryController, 
    getProductsController, 
    searchProductController, 
    updateProductController 
} from "../controllers/product.controller.js";
import authMiddleware from "../middleware/authMiddleware.js"
import requireRole from "../middleware/requireRole.js"

const productRouters = Router()

productRouters.post("/add-product", authMiddleware, requireRole("ADMIN"), addProductController)
productRouters.post("/get-product", getProductsController)
productRouters.put("/update-product/:id", authMiddleware, requireRole("ADMIN"), updateProductController)
productRouters.delete("/delete-product/:id", authMiddleware, requireRole("ADMIN"), deleteProductController)
productRouters.post("/get-products-by-category", getProductsByCategoryController)
productRouters.post("/get-products-by-category-and-sub-category", getProductByCategoryAndSubCategory)
productRouters.post("/get-product-by-id", getProductByProductId)
productRouters.post("/search-product", searchProductController)

export default productRouters;