/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { IoCloseCircleSharp } from "react-icons/io5";
import { TextField, Button, MenuItem } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import AxiosToastError from "../utils/AxiosToastError";
import { useAddress } from "../provider/AddressContext";

function AddNewAddressManually({ setOpenAddNewAddressMenu, setIsAddressMenuOpen }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { fetchAddress } = useAddress();

    const [addressData, setAddressData] = useState({
        saveAs: "address",
        flatHouseNumber: "",
        floor: "",
        street: "",
        area: "",
        landmark: "",
        city: "",
        state: "Uttar Pradesh",
        pincode: "",
        country: "India",
        name: "",
        mobileNumber: "",
        latitude: "0.0",
        longitude: "0.0",
        defaultAddress: true,
    });

    const [deliveryAreas, setDeliveryAreas] = useState([]);
    const [areasLoading, setAreasLoading] = useState(true);

    useEffect(() => {
        let active = true;
        Axios(summaryApi.getActiveDeliveryAreas).then((response) => {
            if (active && response.data?.success) setDeliveryAreas(response.data.data || []);
        }).catch((error) => {
            if (active) toast.error(error.response?.data?.message || "Could not load delivery areas.");
        }).finally(() => { if (active) setAreasLoading(false); });
        return () => { active = false; };
    }, []);

    const handleChange = (field) => (event) => {
        setAddressData((prev) => ({ ...prev, [field]: event.target.value }));
    };

    const handleClose = () => {
        if (location.pathname === "/add-new-address") {
            navigate(-1);
        } else {
            setOpenAddNewAddressMenu(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const response = await Axios({
                ...summaryApi.addNewAddress,
                data: addressData,
            });

            if (response.data.success) {
                await fetchAddress();
                toast.success(response.data.message);
                if (location.state?.returnToCheckout) {
                    navigate("/checkout", { replace: true, state: location.state?.checkoutState || {} });
                } else if (location.pathname === "/add-new-address") {
                    navigate(-1);
                } else {
                    setIsAddressMenuOpen(true);
                    setOpenAddNewAddressMenu(false);
                }
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    return (
        <div className="fixed inset-0 bg-neutral-800/70 flex justify-center items-center h-full z-40 overflow-y-auto w-full p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative h-full overflow-scroll">

                {/* Header */}
                <div className="flex justify-between items-center border-b pb-3">
                    <h2 className="text-lg font-bold">Enter Complete Address</h2>
                    <button className="text-gray-500" onClick={handleClose}>
                        <IoCloseCircleSharp size={25} />
                    </button>
                </div>

                {/* Form Fields */}
                <div className="mt-4 space-y-3">
                    <div className="flex flex-col gap-5">
                        <TextField label="Flat / House No / Building" fullWidth value={addressData.flatHouseNumber} onChange={handleChange("flatHouseNumber")} />
                        <TextField label="Floor (Optional)" fullWidth value={addressData.floor} onChange={handleChange("floor")} />
                        <TextField label="Street" fullWidth value={addressData.street} onChange={handleChange("street")} />
                        <TextField select required label="Delivery area" fullWidth value={addressData.area} onChange={handleChange("area")} disabled={areasLoading || !deliveryAreas.length}>
                            <MenuItem value=""><em>{areasLoading ? "Loading areas…" : "Select delivery area"}</em></MenuItem>
                            {deliveryAreas.map((deliveryArea) => <MenuItem key={deliveryArea._id || deliveryArea.name} value={deliveryArea.name}>{deliveryArea.name}</MenuItem>)}
                        </TextField>
                        <TextField label="Landmark (Optional)" fullWidth value={addressData.landmark} onChange={handleChange("landmark")} />
                        <TextField label="City" fullWidth value={addressData.city} onChange={handleChange("city")} />
                        <TextField label="Pincode" fullWidth value={addressData.pincode} onChange={handleChange("pincode")} />
                        <TextField label="Name" fullWidth value={addressData.name} onChange={handleChange("name")} />
                        <TextField label="Mobile Number" fullWidth value={addressData.mobileNumber} onChange={handleChange("mobileNumber")} />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="mt-4">
                    <Button variant="contained" color="success" fullWidth onClick={handleSubmit}>
                        Save Address
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default AddNewAddressManually;
