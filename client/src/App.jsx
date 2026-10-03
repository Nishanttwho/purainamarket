import { useEffect, useState } from "react";
import { Outlet, useLocation, useMatches } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Header from "./components/Header";
import Footer from "./components/Footer";
import toast, { Toaster } from 'react-hot-toast';
import Login from "./components/Login";
import fetchUserDetails from "./utils/fetchUserDetails";
import { setUserDetails } from "./store/userSlice";
import { useDispatch, useSelector } from "react-redux";
import Axios from "./utils/Axios";
import summaryApi from "./common/summaryApi";
import { setAllCategory, setAllSubCategory, setLoadingCategory } from "./store/productSlice";
import AxiosToastError from "./utils/AxiosToastError";
import { handleAddItem } from "./store/cartProductSlice";
import CartButtonForMobile from "./components/CartButtonForMobile"
import CartSideMenu from "./components/CartSideMenu";
import AddressMenu from "./components/AddressMenu";
import { setAddresses } from "./store/addressSlice";
import AddNewAddressManually from "./components/AddNewAddressManually";
import EditAddressManually from "./components/EditAddressManually";
import StoreStatusBanner from "./components/StoreStatusBanner";
import { StoreAvailabilityProvider } from "./provider/StoreAvailabilityContext";
import { persistReferralCodeFromSearch } from "./utils/referralAttribution";

if (typeof window !== "undefined") {
  persistReferralCodeFromSearch(window.location.search, {
    storage: window.sessionStorage,
    hasExistingSession: Boolean(window.localStorage.getItem("accessToken"))
  });
}

function App() {

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCartMenuOpen, setIsCartMenuOpen] = useState(false);
  const [isAddressMenuOpen, setIsAddressMenuOpen] = useState(false);
  const [openAddNewAddressMenu, setOpenAddNewAddressMenu] = useState(false);
  const [openEditAddressMenu, setOpenEditAddressMenu] = useState(null); // Store selected address
  const [isCartButtonForMobile, setIsCartButtonForMobile] = useState(true)
  const [isUserReady, setIsUserReady] = useState(false);

  const dispatch = useDispatch()
  const user = useSelector((state) => state.user);
  const location = useLocation();
  const matches = useMatches();
  const isRiderArea = location.pathname.startsWith("/rider");
  const hasAdminRoute = matches.some((match) => match.handle?.adminPanel === true);
  const isAdminArea = hasAdminRoute && (user.role === "ADMIN" || matches.some((match) => match.handle?.adminOnly === true));
  const showStorefrontFooter = matches.some((match) => match.handle?.showStorefrontFooter === true);

  const fetchUser = async () => {
    try {
      const userData = await fetchUserDetails()
      if (userData?.data?._id) dispatch(setUserDetails(userData.data))
    } finally {
      setIsUserReady(true)
    }
  }
  
  useEffect(() => {
      const shouldHideCartButton = 
          location.pathname === "/add-new-address" || 
          location.pathname === "/edit-address" ||
          location.pathname === "/cart" ||
          location.pathname === "/checkout" || 
          isAdminArea ||
          openAddNewAddressMenu || 
          openEditAddressMenu;
  
      setIsCartButtonForMobile(!shouldHideCartButton);
  }, [location.pathname, isAdminArea, openAddNewAddressMenu, openEditAddressMenu]);
  // console.warn = () => {};
  // console.error = () => {};

  const fetchCategory = async () => {
    try {
      dispatch(setLoadingCategory(true))
      const response = await Axios({
        ...summaryApi.getCategory,
      })
      // console.log("response: ", response);
      if (response.data.success) {
        dispatch(setAllCategory(response.data.data))
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      dispatch(setLoadingCategory(false))
    }
  }

  const fetchSubCategory = async () => {
    try {
      const response = await Axios({
        ...summaryApi.getSubCategory,
      })
      // console.log("response: ", response);
      if (response.data.success) {
        dispatch(setAllSubCategory(response.data.data))
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  const fetchCartItem = async () => {
    try {
      const response = await Axios({
        ...summaryApi.getCartItems,
      })
      // console.log("response: ", response);

      if (response.data.success) {
        dispatch(handleAddItem(response.data.data))
      }

    } catch (error) {
      console.log(error);
    }
  }

  const fetchAddress = async () => {
    try {
      const response = await Axios({
        ...summaryApi.getAddress,
      })
      // console.log("response: ", response);

      if (response.data.success) {
        dispatch(setAddresses(response.data.data))
      }

    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchUser()
    if (!location.pathname.startsWith("/rider")) {
      fetchCartItem()
      fetchCategory()
      fetchSubCategory()
      fetchAddress()
    }
  }, [])

  useEffect(() => {
    if (user._id && !isRiderArea) { // Fetch cart only if the user is logged in
      fetchCartItem();
    }
  }, [user, isRiderArea]);

  
  return (
    <>
      {!isRiderArea && !isAdminArea && <Header
        setIsLoginOpen={setIsLoginOpen}
        setIsCartMenuOpen={setIsCartMenuOpen}
      />}

      <StoreAvailabilityProvider>
        <main className={isAdminArea || isRiderArea ? "dashboard-route-main" : `min-h-[77vh] w-full bg-white ${["/", "/cart", "/checkout"].includes(location.pathname) ? "pt-8 lg:pt-2" : ""}`}>
          <StoreStatusBanner hidden={isAdminArea || isRiderArea} />
          <Outlet fetchAddress={fetchAddress} context={{ setIsLoginOpen, isUserReady }} />
        </main>
      </StoreAvailabilityProvider>

      {showStorefrontFooter && <Footer />}
      <Toaster />

      {/* Cart option for mobile if there is something in cart */}
      {
        isCartButtonForMobile && !isRiderArea && !isAdminArea && (
          <CartButtonForMobile 
            setIsCartButtonForMobile={setIsCartButtonForMobile}
            setIsCartMenuOpen={setIsCartMenuOpen}
            isCartMenuOpen={isCartMenuOpen}
          />
        )
        
      }

      {/* CartSideMenu for laptop and xl screen */}
      {
        isCartMenuOpen && (
          <>
            <CartSideMenu
              setIsCartMenuOpen={setIsCartMenuOpen}
              setIsAddressMenuOpen={setIsAddressMenuOpen}
              setIsCartButtonForMobile={setIsCartButtonForMobile}
            />
          </>
        )
      }

      {/* Address Menu */}
      {isAddressMenuOpen && (
        <AddressMenu
          setIsAddressMenuOpen={setIsAddressMenuOpen}
          setOpenAddNewAddressMenu={setOpenAddNewAddressMenu}
          setOpenEditAddressMenu={setOpenEditAddressMenu} // Pass setter
        />
      )}

      {
        openAddNewAddressMenu && (
          <>
            {/* <AddNewAddress
              setIsAddressMenuOpen={setIsAddressMenuOpen}
              setOpenAddNewAddressMenu={setOpenAddNewAddressMenu}
            /> */}
            <AddNewAddressManually
              setIsAddressMenuOpen={setIsAddressMenuOpen}
              setOpenAddNewAddressMenu={setOpenAddNewAddressMenu}
            />
          </>
        )
      }

      {/* Edit Address Menu */}
      {openEditAddressMenu && (
        // <EditAddress
        //   data={openEditAddressMenu} // Pass selected address data
        //   setOpenEditAddressMenu={setOpenEditAddressMenu}
        // />
        <EditAddressManually
          data={openEditAddressMenu} // Pass selected address data
          setOpenEditAddressMenu={setOpenEditAddressMenu}
        />
      )}

      {/* Check if Login Component is Being Rendered */}
      <AnimatePresence>
        {isLoginOpen && <Login setIsLoginOpen={setIsLoginOpen} />}
      </AnimatePresence>
    </>
  );
}

export default App;
