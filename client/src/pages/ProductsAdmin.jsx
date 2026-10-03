/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import AxiosToastError from "../utils/AxiosToastError";
import Axios from "../utils/Axios";
import summaryApi from "../common/summaryApi";
import ProductCardAdmin from "./ProductCardAdmin";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import NoData from "../components/NoData";

function ProductsAdmin() {
    const [productsData, setProductsData] = useState([]);
    const [pageNum, setPageNum] = useState(1);
    const [loading, setLoading] = useState(false);
    const [totalPageCount, setTotalPageCount] = useState(1);
    const [allowToEnterPageNumber, setAllowToEnterPageNumber] = useState(false);
    const [inputPage, setInputPage] = useState(pageNum);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All types");
    const [statusFilter, setStatusFilter] = useState("All statuses");
    const [categoryFilter, setCategoryFilter] = useState("All categories");
    const allCategory = useSelector((state) => state.product.allCategory);

    const handlePageInput = (e) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setInputPage(value);
        }
    };

    const handlePageSubmit = () => {
        const pageNumber = Number(inputPage);
        if (pageNumber >= 1 && pageNumber <= totalPageCount) {
            setPageNum(pageNumber);
        } else {
            setInputPage(pageNum);
        }
        setAllowToEnterPageNumber(false);
    };

    const fetchProductsData = async () => {
        try {
            if (pageNum === 1) setLoading(true);
            const response = await Axios({
                ...summaryApi.getProduct,
                data: {
                    page: pageNum,
                    limit: 10,
                    search: search,
                },
            });
            // console.log("response: ", response);

            if (response.data.success) {
                setProductsData(response.data.data);
                setTotalPageCount(response.data.totalNoPage);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        const { value } = e.target;
        setPageNum(1);
        setSearch(value);
    };

    const visibleProducts = productsData.filter((product) => {
        const productType = product.sellingType || "packed";
        const categoryIds = (product.category || []).map((category) => typeof category === "string" ? category : category?._id);
        const typeMatches = typeFilter === "All types" || productType === typeFilter;
        const statusMatches = statusFilter === "All statuses" || (statusFilter === "Published" ? product.publish : !product.publish);
        const categoryMatches = categoryFilter === "All categories" || categoryIds.includes(categoryFilter);
        return typeMatches && statusMatches && categoryMatches;
    });

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProductsData();
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        fetchProductsData();
    }, [pageNum]);

    return (
        <section className="admin-managed-page admin-product-list-page">
            <header className="admin-management-heading">
                <div><p>Catalog</p><h2>Products</h2><span>Search and maintain your store catalogue.</span></div>
                <Link to="/dashboard/upload-product" className="admin-primary-action"><Plus size={17} /> Add product</Link>
            </header>
            <div className="admin-filter-toolbar">
                <label className="admin-search-field">
                    <Search size={17} aria-hidden="true" />
                    <span className="sr-only">Search products</span>
                    <input type="search" placeholder="Search products..." value={search} onChange={handleSearchChange} />
                </label>
                <label className="admin-filter-field"><span>Type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All types</option><option value="packed">Packed</option><option value="loose">Loose / open</option></select></label>
                <label className="admin-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Published</option><option>Unpublished</option></select></label>
                <label className="admin-filter-field"><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{allCategory.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
            </div>

            {loading ? (
                <div className="admin-loading-state" role="status">Loading products…</div>
            ) : visibleProducts.length === 0 ? (
                <div className="admin-empty-state"><NoData message={productsData.length ? "No products match these filters" : "No products found"} subMessage="Try another search or add a product to your catalogue." /><Link to="/dashboard/upload-product" className="admin-primary-action"><Plus size={17} /> Add product</Link></div>
            ) : (
                <div className="admin-product-grid">
                    {visibleProducts.map((product) => <ProductCardAdmin key={product._id} data={product} fetchProductsData={fetchProductsData} />)}
                </div>
            )}

            <nav className="admin-pagination" aria-label="Product pages">
                <button onClick={() => setPageNum(1)} disabled={pageNum === 1}>First</button>
                <button onClick={() => setPageNum(pageNum - 1)} disabled={pageNum === 1}>Previous</button>
                <label>Page <input type="number" min="1" max={totalPageCount} value={allowToEnterPageNumber ? inputPage : pageNum} onFocus={() => setAllowToEnterPageNumber(true)} onChange={handlePageInput} onBlur={handlePageSubmit} onKeyDown={(event) => event.key === "Enter" && handlePageSubmit()} /> of {totalPageCount}</label>
                <button onClick={() => setPageNum(pageNum + 1)} disabled={pageNum === totalPageCount}>Next</button>
                <button onClick={() => setPageNum(totalPageCount)} disabled={pageNum === totalPageCount}>Last</button>
            </nav>
        </section>
    );
}

export default ProductsAdmin;
