import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js";
import UserModel from "../models/user.model.js";

const isPaidOrder = (order) => {
    if (order.paymentStatus === "Paid" || order.paymentStatus === "COD Collected") return true;
    if (order.paymentStatus === "COD Pending" || order.paymentStatus === "Pending") return order.order_status === "Delivered" && order.payment_type === "Cash on Delivery";
    return Boolean(order.paymentId);
};

export const getAdminDashboardController = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);

        const [todayOrders, pendingOrders, activeDeliveries, deliveredToday, customerCount, lowStockProducts, weekOrders, recentOrders] = await Promise.all([
            OrderModel.find({ createdAt: { $gte: todayStart, $lt: tomorrow } }).select("totalAmt paymentId paymentStatus payment_type order_status createdAt deliveredAt").lean(),
            OrderModel.countDocuments({ order_status: "Pending" }),
            OrderModel.countDocuments({ order_status: "Out for Delivery" }),
            OrderModel.find({ order_status: "Delivered", $or: [{ deliveredAt: { $gte: todayStart, $lt: tomorrow } }, { deliveredAt: null, updatedAt: { $gte: todayStart, $lt: tomorrow } }] }).select("_id").lean(),
            UserModel.countDocuments({ role: "USER" }),
            ProductModel.find({ stock: { $ne: null, $lte: 5 } }).select("name stock unit").sort({ stock: 1 }).limit(8).lean(),
            OrderModel.find({ createdAt: { $gte: weekStart, $lt: tomorrow } }).select("totalAmt paymentId paymentStatus payment_type order_status createdAt").lean(),
            OrderModel.find().populate("userId", "name mobile").populate("riderId", "name mobile").populate("delivery_address", "area city village").sort({ createdAt: -1 }).limit(8).lean()
        ]);

        const revenueToday = todayOrders.reduce((total, order) => total + (isPaidOrder(order) ? Number(order.totalAmt) || 0 : 0), 0);
        const revenueByDay = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + index);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const orders = weekOrders.filter((order) => {
                const createdAt = new Date(order.createdAt);
                return createdAt.getFullYear() === date.getFullYear() && createdAt.getMonth() === date.getMonth() && createdAt.getDate() === date.getDate();
            });
            return {
                date: key,
                orders: orders.length,
                revenue: orders.reduce((total, order) => total + (isPaidOrder(order) ? Number(order.totalAmt) || 0 : 0), 0)
            };
        });

        return res.status(200).json({
            success: true,
            error: false,
            data: {
                stats: {
                    todayOrders: todayOrders.length,
                    todaySales: revenueToday,
                    pendingOrders,
                    outForDelivery: activeDeliveries,
                    deliveredToday: deliveredToday.length,
                    totalCustomers: customerCount,
                    lowStockProducts: lowStockProducts.length
                },
                revenueByDay,
                recentOrders,
                lowStockItems: lowStockProducts
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: true, message: error.message || "Unable to load admin dashboard." });
    }
};