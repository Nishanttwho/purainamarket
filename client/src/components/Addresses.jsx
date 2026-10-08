/* eslint-disable react/prop-types */
import { BiArrowBack } from "react-icons/bi";
import { FaPlus } from "react-icons/fa";
import { MdOutlineModeEdit, MdOutlineDelete } from "react-icons/md";
import { useAddress } from "../provider/AddressContext";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import toast from "react-hot-toast";
import { CiLocationOn } from "react-icons/ci";
import { useLocation, useNavigate } from "react-router-dom";

function AddressMenuMobile({ setOpenAddNewAddressMenu }) {
    const { addresses, fetchAddress, isAddressLoading } = useAddress();
    const navigate = useNavigate()
    const location = useLocation();

    const handleDeleteAddress = async (address) => {
        try {
            const response = await Axios({
                ...summaryApi.deleteAddress,
                data: { _id: address._id },
            });

            if (response.data.success) {
                toast.success(response.data.message);
                await fetchAddress();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.log(error);
        }
    };

    const handleDefaultAddress = async (address) => {
        try {
            // console.log("address: ", address);
            const response = await Axios({
                ...summaryApi.setDefaultAddress,
                data: { _id: address?._id },
            })
            // console.log("response: ", response);

            if (response.data.success) {
                toast.success(response.data.message)
                await fetchAddress()
                if (location.state?.returnToCheckout) navigate("/checkout", { replace: true, state: location.state?.checkoutState || {} });
            } else {
                toast.error(response.data.message)
            }
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <section className="h-[70vh]">
            {
                isAddressLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="bg-white flex items-center justify-between sticky top-0 z-10 pb-10">
                        <div className="h-full">
                            {/* Go Back */}
                            <div
                                className="lg:hidden xl:hidden bg-white flex gap-4 px-4 py-4 font-bold cursor-pointer"
                                onClick={() => navigate(-1)}
                            >
                                <BiArrowBack size={22} className="font-extrabold" />
                                <p className="text-sm">Select Delivery Address</p>
                            </div>

                            {/* Add Address */}
                            <div
                                className="bg-white mx-4 mt-3 rounded-2xl cursor-pointer"
                                onClick={() => setOpenAddNewAddressMenu(true)}
                            >
                                <div
                                    className="flex gap-3 py-3 px-4 text-[#0C831F] font-semibold items-center"
                                    onClick={() => navigate("/add-new-address", { state: { returnToCheckout: Boolean(location.state?.returnToCheckout), checkoutState: location.state?.checkoutState || {} } })}
                                >
                                    <FaPlus />
                                    <p>Add a new address</p>
                                </div>
                            </div>

                            <p className="text-[#666666] text-sm px-5 mt-4 font-semibold">Your saved address</p>
                            {addresses.length > 0 && (
                                <div>
                                    {addresses.map((address, index) => (
                                        <div
                                            key={index}
                                            className={`flex flex-col border border-gray-300 w-full p-5 mx-4 mt-3 rounded-xl ${address.defaultAddress ? "border border-[#0C831F] bg-[#E8F5E9]" : "bg-white"}`}
                                        >
                                            <div className="flex gap-3">
                                                <CiLocationOn size={32} className="shrink-0 rounded-lg bg-[#F2F2F2] p-1" aria-hidden="true" />
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-semibold">{[address?.flatHouseNumber, address?.street].filter(Boolean).join(", ") || "Saved address"}{address.defaultAddress ? " · Default" : ""}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {[address?.area, address?.floor, address?.landmark, address?.city && address?.pincode ? `${address.city}-${address.pincode}` : address?.city || address?.pincode]
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {!address.defaultAddress && <button type="button" className="text-xs font-semibold text-[#0C831F]" onClick={() => handleDefaultAddress(address)}>Set as default</button>}
                                                        <button
                                                            type="button"
                                                            className="text-[#0C831F] w-6 p-1 border border-gray-200 rounded-full"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                navigate("/edit-address", { state: { address, returnToCheckout: Boolean(location.state?.returnToCheckout), checkoutState: location.state?.checkoutState || {} } });
                                                            }}
                                                        >
                                                            <MdOutlineModeEdit size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="text-red-500 w-6 p-1 border border-gray-200 rounded-full"
                                                            onClick={(event) => { event.stopPropagation(); handleDeleteAddress(address); }}
                                                        >
                                                            <MdOutlineDelete size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!addresses.length && <p className="px-5 py-4 text-sm text-gray-500">No saved addresses yet.</p>}
                        </div>
                    </div>
                )
            }
        </section>
    );
}

export default AddressMenuMobile;
