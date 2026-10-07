/* eslint-disable react/prop-types */
import { CiStopwatch } from "react-icons/ci";
import { Link } from "react-router-dom";
import { validURLConvertor } from "../utils/validURLConvertor";
import disscountBannerSVG from "../assets/disscountBanner.svg";
import AddToCartButton from "./AddToCartButton";
import { discountedUnitPrice } from "../utils/cartPricing";
import { getLooseBaseUnitPrice, getLooseDiscountedUnitPrice, getLoosePriceUnitLabel } from "../utils/loosePricing";

function ProductCard({data}) {

    const formattedUnit = data?.sellingType === "loose" ? getLoosePriceUnitLabel(data) : (/^\d+$/.test(data?.unit) ? `${data.unit} Unit` : data.unit);
    const looseBasePrice = getLooseBaseUnitPrice(data);
    const looseSalePrice = getLooseDiscountedUnitPrice(data);
    const url = `products-list/${validURLConvertor(data.name)}-${data._id}`;

    return (
        <Link to={url} className='group relative box-border grid h-72 w-36 min-w-36 max-w-36 flex-none grid-rows-[7rem_auto_minmax(2.5rem,auto)_auto_1fr] gap-1 overflow-hidden whitespace-normal rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg sm:h-72 sm:w-40 sm:min-w-40 sm:max-w-40 lg:h-96 lg:w-52 lg:min-w-52 lg:max-w-52 lg:grid-rows-[9rem_auto_minmax(2.5rem,auto)_auto_1fr] lg:gap-3 lg:p-4'>
            
            {
                data.discount > 0 && (
                    <div className="absolute left-2 top-2 z-10 h-9 w-9 flex items-center justify-center lg:left-3 lg:top-3">
                        <img src={disscountBannerSVG} alt="discount" className="w-full h-full absolute"/>
                        <div className="absolute flex flex-col items-center justify-center text-white text-[10px] font-bold">
                            <span>{data.discount}%</span>
                            <span>OFF</span>
                        </div>
                    </div>
                )
            }

            <div className='h-28 overflow-hidden rounded-xl bg-[#f7faf7] p-2 lg:h-36'>
                <img 
                    src={data.image[0]} 
                    alt={data.name}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
            </div>
            <div className='mt-1 flex w-fit items-center justify-center rounded-md bg-emerald-50 px-1.5 py-1 text-[#397724]'>
                <CiStopwatch size={12}/> <span className="text-[9px] font-semibold">8 MINS</span>
            </div>
            <div className='line-clamp-2 min-h-10 min-w-0 break-words text-sm font-semibold leading-5 text-slate-800'>
                {data.name}
            </div>
            <div className='text-xs font-medium text-slate-500 flex items-center'>
                {formattedUnit}
            </div>
            <div className='mt-1 flex min-w-0 flex-wrap items-center justify-between gap-2'>
                {
                    data.discount > 0 ? (
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1">
                            <span className="text-[11px] font-bold line-through text-gray-500">
                                {data?.sellingType === "loose" && "MRP "}&#8377;{data?.sellingType === "loose" ? looseBasePrice : data.price}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900">
                                &#8377;{data?.sellingType === "loose" ? looseSalePrice.toFixed(2) : discountedUnitPrice(data.price, data.discount).toFixed(2)}{data?.sellingType === "loose" ? ` / ${formattedUnit}` : ""}
                            </span>
                        </div>
                    ) : (
                        <span className="text-sm font-extrabold text-slate-900">&#8377;{data?.sellingType === "loose" ? looseBasePrice : data.price}{data?.sellingType === "loose" ? ` / ${formattedUnit}` : ""}</span>
                    )
                }
                <div className="ml-auto w-fit max-w-full shrink-0">
                    <AddToCartButton data={data}/>
                </div>
            </div>
        </Link>
    )
}

export default ProductCard
