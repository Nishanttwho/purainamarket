/* eslint-disable react/prop-types */
import { CiStopwatch } from "react-icons/ci";
import { Link } from "react-router-dom";
import { validURLConvertor } from "../utils/validURLConvertor";
import disscountBannerSVG from "../assets/disscountBanner.svg";
import AddToCartButton from "./AddToCartButton";
import { discountedUnitPrice } from "../utils/cartPricing";
import { getLooseBaseUnitPrice, getLooseDiscountedUnitPrice, getLoosePriceUnitLabel } from "../utils/loosePricing";

function ProductCardForProductListPage({ data }) {

    const formattedUnit = data?.sellingType === "loose" ? getLoosePriceUnitLabel(data) : (/^\d+$/.test(data?.unit) ? `${data.unit} Unit` : data.unit);
    const looseBasePrice = getLooseBaseUnitPrice(data);
    const looseSalePrice = getLooseDiscountedUnitPrice(data);
    const url = `/products-list/${validURLConvertor(data.name)}-${data._id}`;


    return (
        <Link to={url} className="relative grid h-full w-full min-w-0 cursor-pointer gap-2 overflow-hidden rounded border border-gray-200 bg-white px-2 py-2 text-xs sm:px-3">
            {data.stock === 0 && (
                <div className="z-30 absolute inset-0 flex items-center justify-center bg-gray-200/50 text-white text-[11px] font-bold rounded">
                    <span className="bg-gray-600 px-1 rounded-lg">Out of Stock</span>
                </div>
            )}
            {data.discount > 0 && (
                <div className="absolute left-2 w-8 h-8 flex items-center justify-center">
                    <img src={disscountBannerSVG} alt="discount" className="w-full h-full absolute" />
                    <div className="absolute flex flex-col items-center justify-center text-white text-[9px] font-bold">
                        <span>{data.discount}%</span>
                        <span>OFF</span>
                    </div>
                </div>
            )}

            <div className="h-28 sm:h-32 md:h-36 lg:h-40 rounded">
                <img src={data.image[0]} alt={data.name} className="w-full h-full object-scale-down" />
            </div>
            <div className="p-1 rounded w-fit flex bg-[#F8F8F8] items-center justify-center mt-1">
                <CiStopwatch size={12} /> <span className="text-[9px] sm:text-[10px] font-semibold">8 MINS</span>
            </div>
            <div className="line-clamp-2 min-w-0 break-words font-semibold text-sm sm:text-base">
                {data.name}
            </div>
            <div className="text-[11px] sm:text-[12px] text-[#6B6666] flex items-center">
                {formattedUnit}
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                {
                    data.discount > 0 ? (
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1">
                            <span className="text-[11px] font-bold line-through text-gray-500">
                                {data?.sellingType === "loose" && "MRP "}&#8377;{data?.sellingType === "loose" ? looseBasePrice : data.price}
                            </span>
                            <span className="text-[11px] font-bold text-black">
                                &#8377;{data?.sellingType === "loose" ? looseSalePrice.toFixed(2) : discountedUnitPrice(data.price, data.discount).toFixed(2)}{data?.sellingType === "loose" ? ` / ${formattedUnit}` : ""}
                            </span>
                        </div>
                    ) : (
                        <span className="text-[11px] font-bold">&#8377;{data?.sellingType === "loose" ? looseBasePrice : data.price}{data?.sellingType === "loose" ? ` / ${formattedUnit}` : ""}</span>
                    )
                }
                {data.stock !== 0 && (
                    <div className="ml-auto w-fit max-w-full shrink-0">
                        <AddToCartButton data={data}/>
                    </div>
                )}
            </div>
        </Link>
    );
}

export default ProductCardForProductListPage;
