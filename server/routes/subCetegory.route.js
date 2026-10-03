import { Router } from "express";
import { 
    addSubCategoryController, 
    deleteSubCategoryController, 
    getSubCategoriesController, 
    updateSubCategoryController 
} from "../controllers/subCategory.controller.js";
import authMiddleware from "../middleware/authMiddleware.js"
import requireRole from "../middleware/requireRole.js"

const subCategoryRoutes = Router()

subCategoryRoutes.post("/add-sub-category", authMiddleware, requireRole("ADMIN"), addSubCategoryController)
subCategoryRoutes.get("/get-sub-category", getSubCategoriesController)
subCategoryRoutes.put("/update-sub-category", authMiddleware, requireRole("ADMIN"), updateSubCategoryController)
subCategoryRoutes.put("/delete-sub-category", authMiddleware, requireRole("ADMIN"), deleteSubCategoryController)

export default subCategoryRoutes;