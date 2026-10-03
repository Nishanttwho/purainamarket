import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Bike, ClipboardList, LogOut } from "lucide-react";
import fullLogo from "../assets/plogo.png";
import summaryApi from "../common/summaryApi";
import Axios from "../utils/Axios";
import { logout } from "../store/userSlice";

function RiderLayout() {
    const rider = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await Axios(summaryApi.logout);
        } catch {
            // Clear the local session even if the network is unavailable.
        }
        localStorage.clear();
        dispatch(logout());
        navigate("/", { replace: true });
    };

    const navClass = ({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-emerald-800 text-white" : "text-emerald-950 hover:bg-emerald-50"}`;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 md:pb-0">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
                <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4">
                    <Link to="/rider" aria-label="Rider dashboard">
                        <img src={fullLogo} alt="PurainaMarket" className="h-auto w-[min(45vw,190px)] max-w-full" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <p className="text-xs text-slate-500">Signed in as</p>
                            <p className="max-w-40 truncate text-sm font-semibold">{rider.name || "Rider"}</p>
                        </div>
                        <button onClick={handleLogout} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50" aria-label="Log out">
                            <LogOut size={17} /><span className="hidden sm:inline">Log out</span>
                        </button>
                    </div>
                </div>
            </header>

            <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-slate-200 bg-white p-2 md:static md:mx-auto md:flex md:max-w-5xl md:justify-start md:border-0 md:bg-transparent md:px-4 md:py-4">
                <NavLink to="/rider" end className={navClass}><Bike size={18} /> Delivery dashboard</NavLink>
                <NavLink to="/rider/history" className={navClass}><ClipboardList size={18} /> Delivery history</NavLink>
            </nav>

            <main className="mx-auto max-w-5xl px-4 pb-6 md:px-6">
                <Outlet />
            </main>
        </div>
    );
}

export default RiderLayout;
