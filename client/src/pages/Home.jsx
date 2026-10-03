/* eslint-disable no-unused-vars */
import banner from "../assets/banner.jpg";
import pharmaBanner from "../assets/pharmacy.jpg";
import babycare from "../assets/babycare.jpg";
import pet from "../assets/Pet.jpg";
import android_feed from "../assets/android_feed.jpg";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
// import { validURLConvertor } from "../utils/validURLConvertor";
import ProductViewByCategory from "../components/ProductViewByCategory";
import india_last_min_app from "../assets/india's_last_min_app.avif"

function Home() {
    
    const loadingCategory = useSelector(state => state.product.loadingCategory);
    const allCategory = useSelector(state => state.product.allCategory);
    const allSubCategory = useSelector(state => state.product.allSubCategory);

    const navigate = useNavigate();

    const handleRedirectToProductList = (categoryId, categoryName) => {
        const filteredSubCategories = allSubCategory?.filter(subCategory => 
            subCategory.category?.some(cat => cat._id === categoryId)
        );
        // console.log("filteredSubCategories: ", filteredSubCategories);

        // const url = `/${validURLConvertor(categoryName)}-${categoryId}/${validURLConvertor(filteredSubCategories[0].name)}-${filteredSubCategories[0]._id}`
        
        // navigate(url);
        let subCategoryId = filteredSubCategories[0]?._id;
        navigate(`/products-list/${categoryId}/${subCategoryId}`, { state: { categoryId, subCategoryId } });

    };

    return (
        <section className="w-full mx-auto bg-[#f8faf7] px-3 pt-3 sm:px-5 lg:px-10 xl:px-14">
            {/* Large Screen Layout */}
            <div className="hidden lg:block w-full max-w-[1200px] mx-auto">
                <div className="group w-full overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_12px_34px_rgba(18,83,36,0.10)]">
                    <img 
                        src={banner} 
                        alt="Main Banner" 
                        className="w-full cursor-pointer rounded-[28px] transition-transform duration-300 group-hover:scale-[1.01]"
                        onClick={() => navigate("products-list/67bf451e54fc147282502939/67c000d22e4e44504249bb6b")}
                    />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-5">
                    <img 
                        src={pharmaBanner} 
                        alt="Pharmacy" 
                        className="w-full cursor-pointer rounded-2xl border border-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                        onClick={() => navigate("products-list/67bf453554fc147282502942/67c004c32e4e44504249bc13")}
                    />
                    <img 
                        src={pet} 
                        alt="Pet Care" 
                        className="w-full cursor-pointer rounded-2xl border border-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                        onClick={() => navigate("products-list/67bf452d54fc14728250293f/67c0032e2e4e44504249bbcb")}
                    />
                    <img 
                        src={babycare} 
                        alt="Baby Care" 
                        className="w-full cursor-pointer rounded-2xl border border-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                        onClick={() => navigate("products-list/67bf44cc54fc147282502918/67bf4a25508a897165189d7a")}
                    />
                </div>
            </div>

            {/* Mobile Layout */}
            <div className="block lg:hidden mx-auto my-3 w-full max-w-[1200px] overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                <img 
                    src={android_feed} 
                    alt="Mobile Banner" 
                    className="w-full cursor-pointer rounded-2xl"
                    onClick={() => navigate("products-list/67bf451e54fc147282502939/67c000d22e4e44504249bb6b")}
                />
            </div>

            {/* Category Section */}
            <div className="w-full max-w-[1200px] mx-auto my-7">
                <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4a842c]">Browse essentials</p><h2 className="font-bold text-xl tracking-tight text-slate-900 sm:text-2xl">Shop by category</h2></div><span className="hidden text-sm font-medium text-slate-500 sm:block">Fresh picks for every day</span></div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 lg:grid-cols-10 lg:gap-4 justify-center">
                    {loadingCategory ? (
                        new Array(20).fill(null).map((_, index) => (
                            <div 
                                key={index} 
                                className="min-h-28 rounded-2xl bg-white p-3 shadow-sm animate-pulse"
                            >
                                <div className="bg-blue-100 min-h-24 rounded"></div>
                                <div className="bg-blue-100 h-8 rounded"></div>
                            </div>
                        ))
                    ) : (
                        allCategory.map((category, index) => (
                            <div 
                                key={index} 
                                className="group flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-transparent bg-white p-2 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-100 hover:shadow-md"
                                onClick={() => handleRedirectToProductList(category._id, category.name)}
                            >
                                <img 
                                    src={category.image} 
                                    alt={category.name || `Category ${index}`}
                                    className="h-16 w-16 object-contain transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
                                />
                                <span className="mt-1 line-clamp-1 w-full text-center text-[11px] font-semibold text-slate-700 sm:text-xs">{category.name}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Display Category Products */}
            {allCategory.length > 0 && <div className="w-full max-w-[1200px] mx-auto my-7">
                <div className="mx-auto flex justify-between">
                </div>
                <div>
                    {allCategory.slice(0, 7).map((category, index) => (
                        <ProductViewByCategory 
                            key={index} 
                            id={category?._id} 
                            name={category?.name}
                        />
                    ))} 
                </div>
            </div>}

            {/* For md,sm and xs screens*/}
            <div className="lg:hidden xl:hidden mt-6 w-full overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                {/* India's last-minute grocery delivery app */}
                <img src={india_last_min_app} alt="PurainaMarket grocery delivery" className="w-full"/>
            </div>
        </section>
    );
}

export default Home;
