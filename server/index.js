import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import morgan from "morgan"
import helmet from "helmet";
import connectDB from "./config/connectDB.js"
import userRoutes from "./routes/user.route.js"
import categoryRoutes from "./routes/category.route.js"
import imageRoutes from "./routes/image.route.js"
import subCategoryRoutes from "./routes/subCetegory.route.js"
import productRouters from "./routes/product.route.js"
import cartRoutes from "./routes/cart.route.js"
import addressRoutes from "./routes/address.route.js"
import orderRouters from "./routes/order.route.js"
import couponRoutes from "./routes/coupon.route.js"
import storeRoutes from "./routes/store.route.js"
import referralRoutes from "./routes/referral.route.js"
import deliveryAreaRoutes from "./routes/deliveryArea.route.js"
import OrderModel from "./models/order.model.js"

dotenv.config()

const app = express()
const allowedClientOrigins = [];
try {
    const configuredClient = new URL(process.env.CLIENT_URL);
    allowedClientOrigins.push(configuredClient.origin);
    if (configuredClient.hostname === "localhost") {
        configuredClient.hostname = "127.0.0.1";
        allowedClientOrigins.push(configuredClient.origin);
    } else if (configuredClient.hostname === "127.0.0.1") {
        configuredClient.hostname = "localhost";
        allowedClientOrigins.push(configuredClient.origin);
    }
} catch {
    if (process.env.CLIENT_URL) allowedClientOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
    origin: (origin, callback) => {
        callback(null, !origin || allowedClientOrigins.includes(origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(morgan("dev")); // Logs requests in a readable format
app.use(helmet({ crossOriginResourcePolicy: false }));


const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
    //Server to Client
    res.json({
        message: "Server is running at " + PORT
    })
})

app.use("/api/user", userRoutes)
app.use("/api/file", imageRoutes)
app.use("/api/category", categoryRoutes)
app.use("/api/sub-category", subCategoryRoutes)
app.use("/api/product", productRouters)
app.use("/api/cart", cartRoutes)
app.use("/api/address", addressRoutes)
app.use("/api/order", orderRouters)
app.use("/api/coupon", couponRoutes)
app.use("/api/store", storeRoutes)
app.use("/api/referral", referralRoutes)
app.use("/api/delivery-areas", deliveryAreaRoutes)

connectDB().then(async () => {
    try {
        await OrderModel.collection.dropIndex("riderId_1");
        console.log("Removed legacy one-active-order-per-rider index.");
    } catch (error) {
        if (![26, 27].includes(error?.code)) throw error;
    }
    app.listen(PORT, () => {
        console.log(`Server is running on ${PORT}`);
    })
})

