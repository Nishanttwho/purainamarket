import { useEffect, useState } from "react"
import UploadCategoryModel from "../components/UploadCategoryModel"
import AxiosToastError from "../utils/AxiosToastError"
import Axios from "../utils/Axios"
import summaryApi from "../common/summaryApi";
import toast from "react-hot-toast"
import GridLoader from "react-spinners/GridLoader";
import NoData from "../components/NoData"
import { FaEdit } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import UpdateCategoryModel from "../components/UpdateCategoryModel"
import { Link } from "react-router-dom";
import { Plus, Search, Tags } from "lucide-react";
// import { useSelector } from "react-redux"

function Category() {

    const [openUploadCategoryModel, setOpenUploadCategoryModel] = useState(false)
    const [openUpdateCategoryModel, setOpenUpdateCategoryModel] = useState(false)
    const [loading, setLoading] = useState(false)
    const [categoryData, setCategoryData] = useState([])
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [deleteCategoryId, setDeleteCategoryId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const handleOpenUpdateCategoryModel = (category) => {
        setSelectedCategory(category);
        setOpenUpdateCategoryModel(true);
    };

    // const allCategory = useSelector(state => state.product.allCategory)
    // // console.log("allCategory from redux: ", allCategory);

    // useEffect(() => {
    //     setCategoryData(allCategory);
    // }, [allCategory]);

    const fetchCategory = async () => {
        try {
            setLoading(true)
            const response = await Axios({
                ...summaryApi.getCategory,
            })
            // console.log("response: ", response);
            if (response.data.success) {
                // toast.success(response.data.message)
                setCategoryData(response.data.data)
                // console.log("categoryData: ", categoryData);
            } else {
                toast.error(response.data.message)
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCategory()
    }, [])

    const handleOpenConfirmDialog = (categoryId) => {
        setDeleteCategoryId(categoryId);
        setShowConfirmDialog(true);
    };

    const handleConfirmDelete = async () => {
        try {
            setLoading(true);
            setShowConfirmDialog(false); // Close the modal

            const response = await Axios({
                ...summaryApi.deleteCategory,
                data: { categoryId: deleteCategoryId }
            });

            if (response.data.success) {
                toast.success(response.data.message);
                fetchCategory();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCategories = categoryData.filter((category) => category.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

    return (
        <section className="admin-managed-page admin-category-page">
            <header className="admin-management-heading">
                <div><p>Catalog</p><h2>Categories</h2><span>Organize products into customer-facing departments.</span></div>
                <div className="admin-heading-actions">
                    <Link to="/dashboard/sub-category" className="admin-secondary-action"><Tags size={16} /> Subcategories</Link>
                    <button
                    className="admin-primary-action"
                    type="button"
                    onClick={() => setOpenUploadCategoryModel(true)}
                    ><Plus size={17} /> Add category</button>
                </div>
            </header>
            <label className="admin-search-field">
                <Search size={17} aria-hidden="true" />
                <span className="sr-only">Search categories</span>
                <input type="search" placeholder="Search categories..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </label>
            {
                !filteredCategories.length && !loading && (
                    <NoData message={categoryData.length ? "No categories match this search" : "No categories found"} subMessage="Add a category or try another search." />
                )
            }
            <div className="admin-category-grid">
                {filteredCategories.map((category) => (
                    <div
                        key={category._id}
                        className="admin-category-card bg-white"
                    >
                        {/* Buttons Wrapper */}
                        <div className="admin-category-actions">
                            {/* Edit Button */}
                            <button
                                className="admin-card-icon-button"
                                type="button"
                                aria-label={`Edit ${category.name}`}
                                title="Edit category"
                                onClick={() => handleOpenUpdateCategoryModel(category)}
                            >
                                <FaEdit size={16} />
                            </button>

                            {/* Delete Button */}
                            <button
                                className="admin-card-icon-button is-danger"
                                type="button"
                                aria-label={`Delete ${category.name}`}
                                title="Delete category"
                                onClick={() => handleOpenConfirmDialog(category._id)}
                            >
                                <MdDelete size={16} />
                            </button>
                        </div>

                        <img
                            src={category.image}
                            alt={category.name}
                            className="admin-category-image"
                        />
                        <h3>{category.name}</h3>
                    </div>
                ))}
            </div>
            {
                openUploadCategoryModel && (
                    <UploadCategoryModel
                        close={() => setOpenUploadCategoryModel(false)}
                        fetchCategory={fetchCategory}
                    />
                )
            }
            {openUpdateCategoryModel && selectedCategory
                && (
                    <UpdateCategoryModel
                        close={() => setOpenUpdateCategoryModel(false)}
                        fetchCategory={fetchCategory}
                        category={selectedCategory}
                    />
                )
            }
            {
                showConfirmDialog &&
                (
                    <div className="fixed inset-0 flex items-center justify-center bg-neutral-800/70">
                        <div className="bg-white p-6 rounded-md shadow-lg text-center">
                            <h2 className="text-lg font-semibold">Are you sure?</h2>
                            <p className="text-gray-600">Do you really want to delete this category?</p>
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
                    </div>
                )
            }
            {
                loading && (
                    <div className="grid place-items-center mt-[25vh]">
                        <GridLoader color="#434343" margin={2} size={25} />
                    </div>
                )
            }
        </section>
    )
}

export default Category