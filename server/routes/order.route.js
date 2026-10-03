import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js"
import { 
    createCashOnDeliveryOrderController, 
    createStripePaymentOrderController, 
    getAllOrdersController, 
    getOrderDetailsByIdCOntroller, 
    getCheckoutQuoteController,
    getOrdersController,
    razorpayPaymentOrderController,
    razorpayPaymentVerification,
    stripeWebhookPayment,
    updateOrderStatusController
} from "../controllers/order.controller.js";
import {
    acceptRiderOrderController,
    cancelRiderOrderController,
    collectRiderCODController,
    deliverRiderOrderController,
    createRiderAdminController,
    getRidersAdminController,
    getRiderDashboardController,
    getRiderHistoryController,
    getRiderOrderDetailsController
} from "../controllers/rider.controller.js";
import requireRole from "../middleware/requireRole.js";
import { getAdminDashboardController } from "../controllers/adminDashboard.controller.js";

const orderRouters = Router()

orderRouters.post("/add-cash-on-delivery-order", authMiddleware, requireRole("USER"), createCashOnDeliveryOrderController)
orderRouters.post("/checkout-quote", authMiddleware, requireRole("USER"), getCheckoutQuoteController)
orderRouters.get("/get-orders", authMiddleware, requireRole("USER"), getOrdersController)
orderRouters.get("/get-all-orders", authMiddleware, getAllOrdersController)
orderRouters.put("/update-order-status-admin", authMiddleware, updateOrderStatusController)
orderRouters.post("/add-stripe-payment-checkout", authMiddleware, requireRole("USER"), createStripePaymentOrderController)
orderRouters.post("/webhook", stripeWebhookPayment)
orderRouters.post("/add-razor-payment-checkout", authMiddleware, requireRole("USER"), razorpayPaymentOrderController)
orderRouters.post("/razorpay-payment-verification", authMiddleware, requireRole("USER"), razorpayPaymentVerification);
orderRouters.post("/get-order-details-by-id", authMiddleware, getOrderDetailsByIdCOntroller)
orderRouters.get("/rider/dashboard", authMiddleware, requireRole("RIDER"), getRiderDashboardController)
orderRouters.get("/rider/history", authMiddleware, requireRole("RIDER"), getRiderHistoryController)
orderRouters.get("/rider/orders/:orderId", authMiddleware, requireRole("RIDER"), getRiderOrderDetailsController)
orderRouters.post("/rider/orders/:orderId/accept", authMiddleware, requireRole("RIDER"), acceptRiderOrderController)
orderRouters.post("/rider/orders/:orderId/cancel", authMiddleware, requireRole("RIDER"), cancelRiderOrderController)
orderRouters.post("/rider/orders/:orderId/collect-cod", authMiddleware, requireRole("RIDER"), collectRiderCODController)
orderRouters.post("/rider/orders/:orderId/deliver", authMiddleware, requireRole("RIDER"), deliverRiderOrderController)
orderRouters.get("/admin/riders", authMiddleware, requireRole("ADMIN"), getRidersAdminController)
orderRouters.post("/admin/riders", authMiddleware, requireRole("ADMIN"), createRiderAdminController)
orderRouters.get("/admin/dashboard", authMiddleware, requireRole("ADMIN"), getAdminDashboardController)

export default orderRouters
