import {createBrowserRouter} from "react-router-dom"
import App from "../App"
import Home from "../pages/Home"
import SearchPage from "../pages/SearchPage"
import ForgotPassword from "../pages/ForgotPassword"
import VerifyForgotPasswordOTP from "../pages/VerifyForgotPasswordOTP"
import ResetPassword from "../pages/ResetPassword"
import UserMenuForMobileUser from "../pages/UserMenuForMobileUser"
import Dashboard from "../layout/Dashboard"
import Profile from "../pages/Profile"
import MyOrders from "../pages/MyOrders"
import UploadProduct from "../pages/UploadProduct"
import Category from "../pages/Category"
import SubCategory from "../pages/SubCategory"
import ProductsAdmin from "../pages/ProductsAdmin"
import ProtectedRoute from "../components/ProtectedRoute"
import UpdateProduct from "../pages/UpdateProduct"
import ProductList from "../pages/ProductList"
import ProductDetails from "../pages/ProductDetails"
import AllProductsByCategory from "../components/AllProductsByCategory"
import ViewCart from "../pages/ViewCart"
import Addresses from "../components/Addresses"
import CheckOut from "../pages/CheckOut"
import AdminOrders from "../pages/AdminOrders"
import Success from "../pages/Success"
import Cancel from "../pages/Cancel"
import OrderDetails from "../pages/OrderDetails"
import AddNewAddressManually from "../components/AddNewAddressManually"
import EditAddressManually from "../components/EditAddressManually"
import RiderLayout from "../layout/RiderLayout"
import RiderDashboard from "../pages/RiderDashboard"
import RiderHistory from "../pages/RiderHistory"
import RiderOrderDetails from "../pages/RiderOrderDetails"
import RidersAdmin from "../pages/RidersAdmin"
import AdminDashboard from "../pages/AdminDashboard"
import CouponsAdmin from "../pages/CouponsAdmin"
import MyReferrals from "../pages/MyReferrals"
import MyCoupons from "../pages/MyCoupons"
import AdminReferrals from "../pages/AdminReferrals"
import StoreSettings from "../pages/StoreSettings"
import DeliveryAreasAdmin from "../pages/DeliveryAreasAdmin"
import AdminUsers from "../pages/AdminUsers"

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                path: "",
                element: <Home />,
                handle: { showStorefrontFooter: true }
            },
            {
                path: "search",
                element: <SearchPage />,
                handle: { showStorefrontFooter: true }
            },            
            {
                path: "forgot-password",
                element: <ForgotPassword />
            },
            {
                path: "verify-forgot-password-otp",
                element: <VerifyForgotPasswordOTP />
            },
            {
                path: "reset-password",
                element: <ResetPassword />
            },
            {
                path: "user-menu",
                element: <UserMenuForMobileUser />
            },
            {
                path: "rider",
                element: <ProtectedRoute element={<RiderLayout />} allowedRoles={["RIDER"]} />,
                children: [
                    { index: true, element: <RiderDashboard /> },
                    { path: "history", element: <RiderHistory /> },
                    { path: "orders/:orderId", element: <RiderOrderDetails /> }
                ]
            },
            {
                path: "dashboard",
                element: <Dashboard />,
                children: [
                    {
                        index: true,
                        element: <ProtectedRoute element={<AdminDashboard />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "profile",
                        element: <Profile />,
                        handle: { adminPanel: true }
                    },
                    {
                        path: "my-orders",
                        element: <ProtectedRoute element={<MyOrders />} allowedRoles={["USER"]} />,
                        handle: { adminPanel: true }
                    },
                    {
                        path: "referrals",
                        element: <ProtectedRoute element={<MyReferrals />} allowedRoles={["USER"]} />,
                        handle: { adminPanel: true }
                    },
                    {
                        path: "my-coupons",
                        element: <ProtectedRoute element={<MyCoupons />} allowedRoles={["USER"]} />,
                        handle: { adminPanel: true }
                    },
                    {
                        path: "addresses",
                        element: <Addresses />,
                        handle: { adminPanel: true }
                    },
                    {
                        path: "order-details/:orderId",
                        element: <OrderDetails />,
                        handle: { adminPanel: true }
                    },
                    {
                        path: "products",
                        element: <ProtectedRoute element={<ProductsAdmin />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "upload-product",
                        element: <ProtectedRoute element={<UploadProduct />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "category",
                        element: <ProtectedRoute element={<Category />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "sub-category",
                        element: <ProtectedRoute element={<SubCategory />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "update-product/:id",
                        element: <ProtectedRoute element={<UpdateProduct />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "all-orders",
                        element: <ProtectedRoute element={<AdminOrders />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "riders",
                        element: <ProtectedRoute element={<RidersAdmin />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "users",
                        element: <ProtectedRoute element={<AdminUsers />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "coupons",
                        element: <ProtectedRoute element={<CouponsAdmin />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "admin-referrals",
                        element: <ProtectedRoute element={<AdminReferrals />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "store-settings",
                        element: <ProtectedRoute element={<StoreSettings />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                    {
                        path: "delivery-areas",
                        element: <ProtectedRoute element={<DeliveryAreasAdmin />} allowedRoles={["ADMIN"]} />,
                        handle: { adminPanel: true, adminOnly: true }
                    },
                ]
            },
            // {
            //     path: ":category",
            //     children: [
            //         {
            //             path: ":subcategory",
            //             element: <ProductDetails />
            //         }
            //     ]
            // },
            {
                path: "products-list/:product",
                element: <ProductDetails />,
                handle: { showStorefrontFooter: true }
            },
            {
                path: "products-list/:categoryId/:subCategoryId",
                element: <ProductList />,
                handle: { showStorefrontFooter: true }
            },
            {
                path: "all-products-by-category/:categoryId",
                element: <AllProductsByCategory />,
                handle: { showStorefrontFooter: true }
            },
            {
                path: "cart",
                element: <ViewCart />
            },
            // {
            //     path: "address",
            //     element: <Addresses />
            // },
            {
                path: "add-new-address",
                // element: <AddNewAddress />
                element: <AddNewAddressManually />
            },
            {
                path: "edit-address",
                // element: <EditAddress />
                element: <EditAddressManually />
            },
            {
                path: "checkout",
                element: <CheckOut />
            },
            {
                path: "success",
                element: <Success />
            },
            {
                path: "cancel",
                element: <Cancel />
            },
        ]
    }
]);

export default router
