/* eslint-disable react/prop-types */
import { useOutletContext } from "react-router-dom";
import { useSelector } from "react-redux";
import { MdOutlineDesktopAccessDisabled } from "react-icons/md";

const ProtectedRoute = ({ element, allowedRoles }) => {
    const userRole = useSelector((state) => state.user.role); // Get user role from Redux
    const outletContext = useOutletContext();

    if (!outletContext?.isUserReady) {
        return <div className="flex min-h-40 items-center justify-center">Loading account…</div>;
    }

    if (!allowedRoles.includes(userRole)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
                <MdOutlineDesktopAccessDisabled size={100} />
                <p className="text-center text-3xl font-bold">
                    You do not have permission to access this page.
                </p>
            </div>
        )
    }

    return element;
};

export default ProtectedRoute;
