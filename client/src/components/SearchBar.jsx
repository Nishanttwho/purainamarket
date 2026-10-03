import { useEffect, useState } from "react";
import { IoSearch } from "react-icons/io5";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TypeAnimation } from 'react-type-animation';
import useMobile from "../hooks/useMobile";
import { FaArrowLeftLong } from "react-icons/fa6";

function SearchBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSearchPage, setIsSearchPage] = useState(false);
    const [isMobile] = useMobile();

    useEffect(() => {
        setIsSearchPage(location.pathname === "/search");
    }, [location]);

    const searchItems = ["milk", "bread", "sugar", "apple", "paneer", "chocolate", "rice", "butter"];
    const sequence = searchItems.flatMap(item => [`Search "${item}"`, 500]);

    const redirectToSearchPage = () => {
        navigate("/search");
    };

    const handleOnChange = (e)=>{
        const value = e.target.value
        const url = `/search?q=${value}`
        navigate(url)
    }

    return (
        <div className="flex h-12 w-full min-w-0 items-center overflow-hidden rounded-xl border border-emerald-100 bg-[#f7faf7] shadow-inner transition focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 lg:min-w-[560px]">
            <div>
                {
                    (isSearchPage && isMobile) 
                    ? (
                        <Link to={"/"} className="flex justify-center items-center h-full pr-3 mt-1 text-neutral-800">
                            <FaArrowLeftLong size={22}/>
                        </Link>
                    ) 
                    : (
                        <button className="flex h-full items-center justify-center p-3 text-[#176b2b]">
                            <IoSearch size={22} />
                        </button>
                    )
                }

            </div>
            <div className="w-full h-full flex items-center">
                {!isSearchPage ? (
                    // Placeholder animation when not on search page
                    <div className="w-full cursor-text text-sm text-neutral-500" onClick={redirectToSearchPage}>
                        <TypeAnimation
                            sequence={[...sequence]}
                            wrapper="span"
                            cursor={true}
                            repeat={Infinity}
                        />
                    </div>
                ) : (
                    // Input field on the search page
                    <input 
                        type="text" 
                        placeholder="What are you looking for today?"
                        className="h-full w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                        autoFocus={true}
                        onChange={handleOnChange}
                    />
                )}
            </div>
        </div>
    );
}

export default SearchBar;
