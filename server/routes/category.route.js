import { Router } from "express"
import { 
    addCategoryController, 
    deleteCategoryController, 
    getCategoryController, 
    updateCategoryController 
} from "../controllers/category.controller.js"
import authMiddleware from "../middleware/authMiddleware.js"
import requireRole from "../middleware/requireRole.js"

const categoryRoutes = Router()

categoryRoutes.post("/add-category", authMiddleware, requireRole("ADMIN"), addCategoryController)
categoryRoutes.get("/get-category", getCategoryController)
categoryRoutes.put("/update-category", authMiddleware, requireRole("ADMIN"), updateCategoryController)
categoryRoutes.put("/delete-category", authMiddleware, requireRole("ADMIN"), deleteCategoryController)

export default categoryRoutes