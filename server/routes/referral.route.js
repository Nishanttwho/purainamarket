import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import requireRole from "../middleware/requireRole.js";
import { listAdminReferralsController } from "../controllers/referral.controller.js";

const referralRoutes = Router();
referralRoutes.get("/admin", authMiddleware, requireRole("ADMIN"), listAdminReferralsController);

export default referralRoutes;
