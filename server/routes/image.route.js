import {Router} from "express"
import { deleteImageController, uploadImageController } from "../controllers/Image.controller.js"
import upload from "../middleware/multer.js"
import authMiddleware from "../middleware/authMiddleware.js"
import requireRole from "../middleware/requireRole.js"

const imageRoutes = Router()

imageRoutes.post("/upload-image", authMiddleware, requireRole("ADMIN"), upload.single("image"), uploadImageController)
imageRoutes.post("/delete-image", authMiddleware, requireRole("ADMIN"), deleteImageController)

export default imageRoutes