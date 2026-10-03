/* eslint-disable react/prop-types */
import { Link } from "react-router-dom";
import AxiosToastError from "../utils/AxiosToastError";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import { useEffect, useState, useRef } from "react";
import CardLoadingSkeleton from "./CardLoadingSkeleton";
import ProductCard from "./ProductCard";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa6";

function ProductViewByCategory({ id, name }) {

    // console.log(id);

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const containerRef = useRef(null); // Reference for scrolling container

    const loadingCardNumber = new Array(5).fill(null);

    const fetchProductsByCategory = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...summaryApi.getProductByCategory,
                data: {
                    id,
                },
            });
            // console.log(response.data);
            setData(response.data.data);
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductsByCategory();
    }, []);

    // Scroll Left Function
    const scrollLeft = () => {
        if (containerRef.current) {
            containerRef.current.scrollBy({ left: -600, behavior: "smooth" });
        }
    };

    // Scroll Right Function
    const scrollRight = () => {
        if (containerRef.current) {
            containerRef.current.scrollBy({ left: 600, behavior: "smooth" });
        }
    };

    return (
        <>
            <div className="mx-auto flex items-end justify-between px-1">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a842c]">Handpicked for you</p><h2 className="font-bold text-xl tracking-tight text-slate-900 sm:text-2xl">{name}</h2></div>
                <Link 
                    to={`/all-products-by-category/${id}`} 
                    state={{ categoryId: id }} 
                    className="rounded-lg px-2 py-1 text-sm font-bold text-[#0C831F] transition hover:bg-emerald-50"
                >
                    see all
                </Link>
            </div>

            <div className="relative w-full">
                {/* Left Arrow Button */}
                <button 
                    onClick={scrollLeft} 
                    aria-label={`Previous ${name} products`}
                    className="absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2.5 text-slate-700 shadow-md transition hover:bg-emerald-50 lg:block"
                >
                    <FaAngleLeft />
                </button>

                {/* Product List */}
                <div 
                    ref={containerRef} 
                    className="no-scrollbar flex gap-3 sm:gap-4 lg:gap-5 mx-auto py-4 overflow-x-auto scroll-smooth whitespace-nowrap"
                >
                    {loading &&
                        loadingCardNumber.map((_, index) => (
                            <CardLoadingSkeleton key={index} />
                        ))
                    }
                    {data
                        .filter(product => product.stock !== 0) // Exclude out-of-stock products
                        .slice(0, 15)
                        .map((product, index) => (
                            <ProductCard data={product} key={index} />
                        ))
                    }
                </div>

                {/* Right Arrow Button */}
                <button 
                    onClick={scrollRight} 
                    aria-label={`Next ${name} products`}
                    className="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2.5 text-slate-700 shadow-md transition hover:bg-emerald-50 lg:block"
                >
                    <FaAngleRight />
                </button>
            </div>
        </>
    );
}

export default ProductViewByCategory;
