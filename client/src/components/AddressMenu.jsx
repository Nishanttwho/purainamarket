/* eslint-disable react/prop-types */
import { BiArrowBack } from "react-icons/bi";
import { FaPlus } from "react-icons/fa";
import { CiLocationOn } from "react-icons/ci";
import { MdOutlineModeEdit, MdOutlineDelete } from "react-icons/md";
import { useAddress } from "../provider/AddressContext";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import toast from "react-hot-toast";

function AddressMenu({ setIsAddressMenuOpen, setOpenAddNewAddressMenu, setOpenEditAddressMenu }) {
    const { addresses, fetchAddress, isAddressLoading } = useAddress();

    const handleDeleteAddress = async (address) => {
        try {
            const response = await Axios({
                ...summaryApi.deleteAddress,
                data: { _id: address._id },
            })     
            
            // console.log("response: ", response);
            
            if(response.data.success) {
                toast.success(response.data.message)
                await fetchAddress()
            } else {
                toast.error(response.data.message)
            }
            
        } catch (error) {
            console.log(error);
        }
    }

    const handleSetDefaultAddress = async (address) => {
        try {
            // console.log("address: ", address);
            
            const response = await Axios({
                ...summaryApi.setDefaultAddress,
                data: { _id: address?._id },
            })
            // console.log("response: ", response);
            
            if(response.data.success) {
                toast.success(response.data.message)
                await fetchAddress()
            }else {
                toast.error(response.data.message)
            }
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <section className="fixed top-0 bottom-0 left-0 right-0 bg-neutral-800/70 z-40">
            <div className="fixed top-0 right-0 h-full pb-10 bg-[#F5F7FD] w-full sm:w-full md:w-[400px] lg:w-[400px] shadow-lg mb-64 overflow-y-auto">

                {/* Go Back */}
                <div
                    className="bg-white flex gap-4 px-2 py-4 font-bold cursor-pointer"
                    onClick={() => setIsAddressMenuOpen(false)}
                >
                    <BiArrowBack size={22} className="font-extrabold" />
                    <p className="text-sm">Select Delivery address</p>
                </div>

                {/* Add Address */}
                <div
                    className="bg-white mx-4 mt-3 rounded-2xl cursor-pointer"
                    onClick={() => setOpenAddNewAddressMenu(true)}
                >
                    <div className="flex gap-3 py-3 px-4 text-[#0C831F] font-semibold items-center">
                        <FaPlus />
                        <p>Add a new address</p>
                    </div>
                </div>

                <p className="text-[#666666] text-sm px-5 mt-4 font-semibold">Your saved address</p>
                {isAddressLoading ? <p className="px-5 py-4 text-sm text-gray-500">Loading saved addresses…</p> : addresses.length > 0 ? (
                    <div>
                        {addresses.map((address, index) => (
                            <div 
                                key={index} 
                                className={`flex flex-col p-2 mx-4 mt-3 rounded-xl ${address.defaultAddress ? "border border-[#0C831F] bg-[#E8F5E9]" : "bg-white"}`}
                            >
                                <div className="flex gap-3">
                                    <CiLocationOn size={28} className="shrink-0 rounded-lg bg-[#F2F2F2] p-1" aria-hidden="true" />
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
                                            {!address.defaultAddress && <button type="button" className="text-xs font-semibold text-[#0C831F]" onClick={() => handleSetDefaultAddress(address)}>Set as default</button>}
                                            <button
                                                type="button"
                                                className="text-[#0C831F] w-6 p-1 border border-gray-200 rounded-full"
                                                onClick={(event) => {
                                                    event.stopPropagation(); // Prevent triggering handleSetDefaultAddress
                                                    setOpenEditAddressMenu(address);
                                                }}
                                            >
                                                <MdOutlineModeEdit size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                className="text-red-500 w-6 p-1 border border-gray-200 rounded-full"
                                                onClick={(event) => {
                                                    event.stopPropagation(); // Prevent triggering handleSetDefaultAddress
                                                    handleDeleteAddress(address);
                                                }}
                                            >
                                                <MdOutlineDelete size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <p className="px-5 py-4 text-sm text-gray-500">No saved addresses yet.</p>}
            </div>
        </section>
    );
}

export default AddressMenu;
