import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { FaHome, FaRegUser, FaFileUpload, FaUserCircle, FaBox } from "react-icons/fa";
import { MdOutlineListAlt, MdCategory } from "react-icons/md";
import { IoArrowBack } from "react-icons/io5";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";;
import { logout } from "../store/userSlice";
import toast from "react-hot-toast";
import AxiosToastError from "../utils/AxiosToastError";
import { AiFillProduct } from "react-icons/ai";
import { TbCategory } from "react-icons/tb";
import { useLocation } from "react-router-dom";
import { Truck, Users } from "lucide-react";

function DashBoardLeftSide() {
    const user = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            const response = await Axios(summaryApi.logout);
            if (response.data.success) {
                dispatch(logout());
                localStorage.clear();
                toast.success(response.data.message);
                navigate("/");
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    return (
        <div className="admin-sidebar-content bg-white top-0">
            {/* Back Button */}
            <button
                className="admin-sidebar-back flex items-center space-x-2 text-[#666666] text-lg hover:text-black transition duration-200 hover:bg-gray-200 px-2 py-3 w-full border-b border-gray-300"
                onClick={() => navigate("/")}
            >
                <IoArrowBack size={24} /> <span>Go Back</span>
            </button>
            {/* User Info */}
            <Link to={"/dashboard/profile"}>
                <div className={`py-3 flex items-center space-x-4  border-gray-300 border-b px-2 ${location.pathname === "/dashboard/profile" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}>
                    {user?.avatar && user.avatar !== "" ? (
                        <img
                            src={user.avatar}
                            alt="User Avatar"
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <FaUserCircle size={48} className="text-black" />
                    )}
                    <div className="flex flex-col">
                        <p className="text-lg font-medium w-[150px] truncate">
                            {user?.name}
                            <span className="text-sm text-[#878787]">
                                {user.role === "ADMIN" ? " (admin)" : ""}
                            </span>
                        </p>
                        <p className="text-sm text-gray-500 w-[150px] truncate">{user?.email}</p>
                    </div>
                </div>
            </Link>
            {/* Menu Items */}
            <div className="admin-sidebar-nav">
                {
                    user.role === "ADMIN"
                    && (
                        <>
                            <Link
                                to="/dashboard"
                                className={`py-3 flex items-center space-x-4 border-gray-300 border-b px-2 ${location.pathname === "/dashboard" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                            >
                                <FaHome size={20} /> <span>Dashboard</span>
                            </Link>
                            <Link
                                to="/dashboard/category"
                                className={`py-3 flex items-center space-x-4  border-gray-300 border-b px-2 ${location.pathname === "/dashboard/category" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                            >
                                <TbCategory size={20} /> <span>Category</span>
                            </Link>
                            <Link
                                to="/dashboard/sub-category"
                                className={`py-3 flex items-center space-x-4  border-gray-300 border-b px-2 ${location.pathname === "/dashboard/sub-category" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                            >
                                <MdCategory size={20} /> <span>Sub Category</span>
                            </Link>
                            <Link
                                to="/dashboard/products"
                                className={`py-3 flex items-center space-x-4  border-gray-300 border-b px-2 ${location.pathname === "/dashboard/products" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                            >
                                <AiFillProduct size={20} /> <span>Products</span>
                            </Link>
                            <Link
                                to="/dashboard/upload-product"
                                className={`py-3 flex items-center space-x-4  border-gray-300 border-b px-2 ${location.pathname === "/dashboard/upload-product" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                            >
                                <FaFileUpload size={18} /> <span>Upload Product</span>
                            </Link>
                            <Link
                                to="/dashboard/all-orders"
                                className={`py-3 flex items-center space-x-4  border-gray-300 border-b px-2 ${location.pathname === "/dashboard/all-orders" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                            >
                                <FaBox size={18} /> <span>All Orders</span>
                            </Link>
                            <Link
                                to="/dashboard/riders"
                                className={`py-3 flex items-center space-x-4 border-gray-300 border-b px-2 ${location.pathname === "/dashboard/riders" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                            >
                                <FaUserCircle size={18} /> <span>Riders</span>
                            </Link>
                            <Link to="/dashboard/users" className={`py-3 flex items-center space-x-4 border-gray-300 border-b px-2 ${location.pathname === "/dashboard/users" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}><Users size={18} /> <span>Users</span></Link>
                            <Link
                                to="/dashboard/coupons"
                                className={`py-3 flex items-center space-x-4 border-gray-300 border-b px-2 ${location.pathname === "/dashboard/coupons" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                            >
                                <span className="text-lg font-bold leading-none">%</span> <span>Coupons</span>
                            </Link>
                            <Link to="/dashboard/admin-referrals" className={`py-3 flex items-center space-x-4 border-gray-300 border-b px-2 ${location.pathname === "/dashboard/admin-referrals" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}><span className="text-lg font-bold">↗</span><span>Referrals</span></Link>
                            <Link to="/dashboard/delivery-areas" className={`py-3 flex items-center space-x-4 border-gray-300 border-b px-2 ${location.pathname === "/dashboard/delivery-areas" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}><Truck size={18} /><span>Delivery areas</span></Link>
                            <Link to="/dashboard/store-settings" className={`py-3 flex items-center space-x-4 border-gray-300 border-b px-2 ${location.pathname === "/dashboard/store-settings" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}><span className="text-lg font-bold">◷</span><span>Store settings</span></Link>
                        </>
                    )
                }
                {user.role === "USER" && <Link
                    to="/dashboard/my-orders"
                    className={`py-3 flex items-center space-x-4  border-gray-300 border-b px-2 ${location.pathname === "/dashboard/my-orders" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                >
                    <MdOutlineListAlt size={20} /> <span>My Orders</span>
                </Link>}
                {user.role === "USER" && <>
                    <Link to="/dashboard/referrals" className={`py-3 flex items-center space-x-4 border-gray-300 border-b px-2 ${location.pathname === "/dashboard/referrals" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}>Referrals</Link>
                    <Link to="/dashboard/my-coupons" className={`py-3 flex items-center space-x-4 border-gray-300 border-b px-2 ${location.pathname === "/dashboard/my-coupons" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}>My Coupons</Link>
                </>}
                <Link
                    to="/dashboard/addresses"
                    className={`py-3 flex items-center space-x-4  border-gray-300 border-b px-2 ${location.pathname === "/dashboard/addresses" ? "text-black bg-gray-200" : "text-[#666666] hover:text-black transition duration-200 hover:bg-gray-200"}`}
                >
                    <FaHome size={20} /> <span>Saved Addresses</span>
                </Link>
                <button
                    className="text-[#ed1212] py-3 flex items-center space-x-4 hover:text-red-700 transition duration-200 hover:bg-red-200 border-gray-300 border-b px-2 w-full"
                    onClick={handleLogout}
                >
                    <FaRegUser size={20} /> <span>Logout</span>
                </button>
            </div>
        </div>
    );
}

export default DashBoardLeftSide;
