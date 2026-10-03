import { Link, Outlet, useLocation, useMatches, useOutletContext } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import fullLogo from "../assets/plogo.png";
import DashboardLeftSide from "../components/DashBoardLeftSide";
import "./Dashboard.css";
import "./AdminManagement.css";

function Dashboard() {
    const outletContext = useOutletContext();
    const location = useLocation();
    const matches = useMatches();
    const role = useSelector((state) => state.user.role);
    const user = useSelector((state) => state.user);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const hasAdminRoute = matches.some((match) => match.handle?.adminPanel === true);
    const isAdminPanel = hasAdminRoute && (role === "ADMIN" || matches.some((match) => match.handle?.adminOnly === true));
    const pageTitle = location.pathname === "/dashboard" ? "Overview"
        : location.pathname.includes("all-orders") ? "Orders"
            : location.pathname.includes("upload-product") ? "Add product"
                : location.pathname.includes("update-product") ? "Edit product"
                    : location.pathname.includes("products") ? "Products"
                        : location.pathname.includes("sub-category") ? "Subcategories"
                            : location.pathname.includes("category") ? "Categories"
                                        : location.pathname.includes("riders") ? "Riders"
                                            : location.pathname.includes("users") ? "Users"
                                            : location.pathname.includes("coupons") ? "Coupons"
                                                : location.pathname.includes("admin-referrals") ? "Referrals"
                                                    : location.pathname.includes("store-settings") ? "Store settings"
                                                        : location.pathname.includes("referrals") ? "Referrals"
                                    : location.pathname.includes("order-details") ? "Order details"
                                        : location.pathname.includes("addresses") ? "Addresses"
                                            : location.pathname.includes("my-orders") ? "My orders" : "Profile";

    if (isAdminPanel) {
        return (
            <section className="admin-panel-shell">
                {mobileNavOpen && <button className="admin-panel-overlay" aria-label="Close admin menu" onClick={() => setMobileNavOpen(false)} />}
                <aside className={`admin-panel-sidebar ${mobileNavOpen ? "is-open" : ""}`} onClick={() => setMobileNavOpen(false)}>
                    <Link to="/dashboard" className="admin-panel-brand" aria-label="PurainaMarket admin dashboard">
                        <img src={fullLogo} alt="PurainaMarket" />
                        <span>STORE ADMIN</span>
                    </Link>
                    <DashboardLeftSide />
                </aside>
                <div className="admin-panel-workspace">
                    <header className="admin-panel-topbar">
                        <button className="admin-panel-menu-button" type="button" aria-label={mobileNavOpen ? "Close admin menu" : "Open admin menu"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(!mobileNavOpen)}>
                            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div className="admin-panel-heading">
                            <span>PurainaMarket operations</span>
                            <h1>{pageTitle}</h1>
                        </div>
                        <div className="admin-panel-identity">
                            <span>{user.name || "Store administrator"}</span>
                            <small>ADMIN</small>
                        </div>
                    </header>
                    <div className="admin-panel-content">
                        <Outlet context={outletContext} />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="customer-dashboard-shell bg-white flex flex-col items-center justify-center pt-4 lg:pt-7">
            {role === "ADMIN" && <nav className="mb-3 flex w-full max-w-5xl gap-2 overflow-x-auto px-3 pb-2 lg:hidden" aria-label="Admin navigation">
                {[["Dashboard", "/dashboard"], ["Orders", "/dashboard/all-orders"], ["Products", "/dashboard/products"], ["Categories", "/dashboard/category"], ["Riders", "/dashboard/riders"]].map(([label, path]) => <Link key={path} to={path} className="shrink-0 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">{label}</Link>)}
            </nav>}
            <div className="container mx-auto grid lg:grid-cols-[260px_1fr] h-[75vh] mb-10 shadow-2xl w-full max-w-5xl px-2">
                {/* Left Sidebar */}
                <div className="py-4 sticky max-h-[calc(100vh-150px)] top-0 overflow-y-scroll hidden lg:block border-r border-gray-300">
                    <DashboardLeftSide />
                </div>
                {/* Right Content */}
                <div className="bg-white max-h-[70vh] overflow-y-scroll px-4 pb-2">
                    <Outlet context={outletContext} />
                </div>
            </div>
        </section>
    )
}

export default Dashboard;
