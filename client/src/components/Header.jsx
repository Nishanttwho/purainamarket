/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import { Link, useLocation, useNavigate } from "react-router-dom";
import fullLogo from "../assets/plogo.png";
import SearchBar from "./SearchBar";
import useMobile from "../hooks/useMobile";
import { HiOutlineShoppingCart } from "react-icons/hi";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { FaUserCircle } from "react-icons/fa";
import UserMenu from "./UserMenu";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";

function Header({ setIsLoginOpen, setIsCartMenuOpen }) {
    const [isMobile] = useMobile();
    const location = useLocation();
    const isSearchPage = location.pathname === "/search";
    const isInternalPage = location.pathname.startsWith("/dashboard") || location.pathname === "/user-menu";
    const showSiteSearch = !isInternalPage && location.pathname !== "/checkout";
    const navigate = useNavigate()
    const cartItem = useSelector((state) => state.cartItem.cart);
    const user = useSelector((state) => state?.user)
    // console.log("user from store: ", user);


    const [openUserMenu, setOpenUserMenu] = useState(false)
    const [userData, setUserData] = useState(user);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);


    useEffect(() => {
        let itemsCount = 0;
        let priceCount = 0;

        // for (const item of cartItem) {
        //     itemsCount += item.quantity;
        //     const discountedPrice = item.productId.price * (1 - item.productId.discount / 100);
        //     priceCount += discountedPrice * item.quantity;
        // }
        itemsCount = cartItem.reduce((prev, curr) => {
            return prev + (curr.sellingType === "loose" ? 1 : curr.quantity);
        }, 0)
        priceCount = parseFloat(cartItem.reduce((prev, curr) => {
            return prev + (curr.linePrice ?? curr.productId.price * (1 - curr.productId.discount / 100)) * (curr.sellingType === "loose" ? 1 : curr.quantity);
        }, 0).toFixed(2));

        setTotalItems(itemsCount);
        setTotalPrice(priceCount);
    }, [cartItem]);



    useEffect(() => {
        // console.log("User state updated:", user);
        setOpenUserMenu(false);
        setUserData(user);
    }, [user]);

    const handleMobileUser = () => {
        if (!user._id) {
            setIsLoginOpen(true)
        }
        navigate("/user-menu")
    }

    return (
        <header className={`fixed top-0 left-0 w-full ${isInternalPage ? "h-16 lg:h-20" : "h-28 lg:h-22 lg:min-h-15"} border-b border-emerald-100 bg-white/95 px-2 shadow-[0_2px_14px_rgba(15,23,42,0.05)] backdrop-blur z-40`}>
            {!(isSearchPage && isMobile) && (
                <div className="container mx-auto flex min-h-15 items-center justify-between gap-2 px-3 lg:max-w-[1440px] lg:px-5">
                    {/* Logo */}
                    <div className="shrink-0 px-1 lg:border-r lg:border-emerald-100 lg:px-5">
                        <Link to="/" className="flex items-center">
                            <img src={fullLogo} alt="PurainaMarket" className="block h-auto w-[min(46vw,180px)] max-w-full sm:w-[190px] lg:w-[220px] xl:w-[240px]" />
                        </Link>
                    </div>

                    {/* Search Section */}
                    <div className={`hover:cursor-pointer hidden ${showSiteSearch ? "lg:block" : "hidden"}`}>
                        <SearchBar />
                    </div>

                    {/* Login, User Icon, and Cart */}
                    <div className={`${location.pathname === "/checkout" ? "hidden" : "flex items-center gap-4 lg:gap-8"}`}>
                        {/* User Icon (for mobile) */}
                        <button
                            className="rounded-full p-1 transition hover:bg-emerald-50 lg:hidden"
                            onClick={handleMobileUser}
                        >
                            {user?.avatar && user.avatar !== ""
                                ? (
                                    <img
                                        src={user.avatar}
                                        alt="User Avatar"
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <FaUserCircle size={25} className="text-black" />
                                )
                            }
                        </button>

                        {/* Login Button */}
                        {
                            user?._id
                                ? (
                                    <div className="hidden lg:block relative w-[40%] p-2 select-none">
                                        <div
                                            className="flex gap-2 items-center cursor-pointer rounded-xl p-2 hover:bg-emerald-50"
                                            onClick={() => setOpenUserMenu(prev => !prev)}
                                        >
                                            <p className="text-lg">Account</p>
                                            {openUserMenu ? <IoMdArrowDropup size={60} /> : <IoMdArrowDropdown size={60} />}
                                        </div>
                                        <div className="absolute right-0 top-16">
                                            {openUserMenu && (
                                                <div className="bg-[#ffffff] rounded-md p-4 min-w-52 lg:shadow-lg">
                                                    <UserMenu closeMenu={() => setOpenUserMenu(false)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                                : (
                                    <button
                                        onClick={() => {
                                            setIsLoginOpen(true);
                                        }}
                                        className="hidden rounded-xl px-3 py-2 text-base font-bold text-[#176b2b] transition hover:bg-emerald-50 lg:block"
                                    >
                                        Login
                                    </button>
                                )
                        }

                        {/* Cart Button */}
                        <button
                            className={`hidden min-w-[7.5rem] w-auto items-center justify-around gap-2 rounded-xl bg-[#176b2b] px-3 py-2.5 text-white shadow-sm transition hover:bg-[#0c831f] hover:shadow-md lg:flex ${isInternalPage ? "lg:hidden" : ""}`}
                            onClick={() => {
                                if (user._id) {
                                    setIsCartMenuOpen(true);
                                }
                            }}
                        >
                            <div>
                                <HiOutlineShoppingCart size={30} />
                            </div>
                            {
                                cartItem.length > 0 ? (
                                    <div className="font-bold flex flex-col text-sm items-center justify-center">
                                        <p>{totalItems} items</p>
                                        <p>&#8377;{totalPrice}</p>
                                    </div>
                                ) : (
                                    <div
                                        className="font-bold"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevents triggering the parent button's onClick
                                            !user._id ? setIsLoginOpen(true) : setIsCartMenuOpen(true);
                                        }}
                                    >
                                        My Cart
                                    </div>
                                )
                            }
                        </button>

                    </div>
                </div>
            )}

            {/* Mobile Search Bar */}
            {showSiteSearch && <div className={`container mx-auto px-4 lg:hidden ${isSearchPage && isMobile ? "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" : ""}`}>
                <SearchBar />
            </div>}
        </header>
    );
}

export default Header;
