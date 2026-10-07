/* eslint-disable react/prop-types */
import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AxiosToastError from "../utils/AxiosToastError";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";;
import toast from "react-hot-toast";
import { useState } from "react";
import GridLoader from "react-spinners/GridLoader";
import { getLooseBaseUnitPrice, getLooseDiscountedUnitPrice, getLoosePriceUnitLabel } from "../utils/loosePricing";
function ProductCardAdmin({ data, fetchProductsData }) {
    
    const navigate = useNavigate();

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [loading, setLoading] = useState(false);

    // Check if the unit contains only digits
    const formattedUnit = /^\d+$/.test(data?.unit) ? `${data.unit} Unit` : data.unit;
    const basePrice = Number(data?.sellingType === "loose" ? getLooseBaseUnitPrice(data) : data?.price) || 0;
    const discount = Number(data?.discount) || 0;
    const currentPrice = data?.sellingType === "loose" ? getLooseDiscountedUnitPrice(data) : basePrice * (1 - discount / 100);
    // console.log(data); //degubging
    

    const handleConfirmDelete = async () => {
        try {
            setLoading(true)
            const response = await Axios({
                ...summaryApi.deleteProduct,
                url: summaryApi.deleteProduct.url.replace(":id", data._id),
            });
            // console.log("response:", response);
    
            if (response.data.success) {
                toast.success(response.data.message || "Product deleted successfully!");
                fetchProductsData()
            } else {
                toast.error(response.data.message || "Failed to delete product");
            }
    
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false)
        }
    };

    const handleOpenConfirmDialog = () => {
        setShowConfirmDialog(true);
    };
    

    return (
        <>
            <article className="admin-product-card max-w-50 w-auto shadow-lg p-1 rounded-lg flex flex-col items-center text-center relative bg-gray-50">
                
                {/* Buttons Wrapper */}
                <div className="absolute top-2 right-2 flex space-x-2">
                    {/* Edit Button */}
                    <button
                        className="admin-card-icon-button"
                        type="button"
                        aria-label={`Edit ${data.name}`}
                        title="Edit product"
                        onClick={() => 
                            navigate(`/dashboard/update-product/${data._id}`, 
                                { state: { product: data } }
                            )
                        }
                    >
                        <Pencil size={16} />
                    </button>

                    {/* Delete Button */}
                    <button
                        className="admin-card-icon-button is-danger"
                        type="button"
                        aria-label={`Delete ${data.name}`}
                        title="Delete product"
                        onClick={handleOpenConfirmDialog}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="admin-product-card-image w-full h-32 flex items-center justify-center">
                    <img
                        src={data?.image?.[0]}  
                        alt={data?.name}
                        className="w-20 h-20 object-contain"
                    />
                </div>
                <div className="admin-product-card-info">
                    <p className="admin-product-card-name text-sm font-medium text-gray-800 line-clamp-2">{data?.name}</p>
                    <p className="admin-product-card-kind">{data?.sellingType === "loose" ? "Loose / open" : `Packed${formattedUnit ? ` · ${formattedUnit}` : ""}`}</p>
                    <div className="admin-product-card-price">
                        {discount > 0 && <span>₹{basePrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>}
                        <strong>₹{currentPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}{data?.sellingType === "loose" ? ` / ${getLoosePriceUnitLabel(data)}` : ""}</strong>
                        {discount > 0 && <em>{discount}% off</em>}
                    </div>
                    <div className="admin-product-card-footer">
                        <span>Stock: {data?.stock === null ? "Not tracked" : `${data?.stock ?? 0} ${data?.sellingType === "loose" ? "kg" : "units"}`}</span>
                        <span className={data?.publish ? "is-published" : "is-unpublished"}>{data?.publish ? "Published" : "Hidden"}</span>
                    </div>
                </div>
            </article>
            {showConfirmDialog && (
                <div className="admin-confirm-overlay fixed inset-0 flex items-center justify-center bg-neutral-800/70 z-50">
                    <div className="admin-confirm-dialog bg-white p-6 rounded-md shadow-lg text-center">
                        {loading ? (
                            <div className="grid place-items-center">
                                <GridLoader color="#434343" margin={2} size={25} />
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-lg font-semibold">Are you sure?</h2>
                                <p className="text-gray-600">Do you really want to delete this Product?</p>
                                <div className="mt-4 flex justify-center space-x-4">
                                    <button 
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                        onClick={handleConfirmDelete}
                                    >
                                        Yes, Delete
                                    </button>
                                    <button 
                                        className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400"
                                        onClick={() => setShowConfirmDialog(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

export default ProductCardAdmin;
