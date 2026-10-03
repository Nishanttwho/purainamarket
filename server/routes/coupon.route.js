import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/requireRole.js";
import {
    createAdminCouponController,
    disableAdminCouponController,
    getAdminCouponUsageController,
    listAdminCouponsController,
    listMyCouponsController,
    searchCouponUsersController,
    updateAdminCouponController,
    validateCartCouponController
} from "../controllers/coupon.controller.js";

const couponRoutes = Router();

couponRoutes.post("/validate", authMiddleware, requireRole("USER"), validateCartCouponController);
couponRoutes.get("/mine", authMiddleware, requireRole("USER"), listMyCouponsController);
couponRoutes.get("/admin/users", authMiddleware, requireRole("ADMIN"), searchCouponUsersController);
couponRoutes.get("/admin", authMiddleware, requireRole("ADMIN"), listAdminCouponsController);
couponRoutes.post("/admin", authMiddleware, requireRole("ADMIN"), createAdminCouponController);
couponRoutes.get("/admin/:id/usage", authMiddleware, requireRole("ADMIN"), getAdminCouponUsageController);
couponRoutes.put("/admin/:id", authMiddleware, requireRole("ADMIN"), updateAdminCouponController);
couponRoutes.delete("/admin/:id", authMiddleware, requireRole("ADMIN"), disableAdminCouponController);

export default couponRoutes;
