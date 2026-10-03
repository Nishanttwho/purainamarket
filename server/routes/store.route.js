import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/requireRole.js";
import {
    getAdminStoreSettingsController,
    getPublicStoreStatusController,
    updateAdminStoreSettingsController
} from "../controllers/store.controller.js";

const storeRoutes = Router();
storeRoutes.get("/status", getPublicStoreStatusController);
storeRoutes.get("/admin/settings", authMiddleware, requireRole("ADMIN"), getAdminStoreSettingsController);
storeRoutes.put("/admin/settings", authMiddleware, requireRole("ADMIN"), updateAdminStoreSettingsController);

export default storeRoutes;
