import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(scriptDirectory, "../.env") });

const [{ default: mongoose }, { default: connectDB }, { default: CategoryModel }, { default: SubCategoryModel }, { default: ProductModel }, { default: OrderModel }, { default: CartProductModel }] = await Promise.all([
    import("mongoose"),
    import("../config/connectDB.js"),
    import("../models/category.model.js"),
    import("../models/subCategory.model.js"),
    import("../models/product.model.js"),
    import("../models/order.model.js"),
    import("../models/cartProduct.model.js")
]);

const DEMO_PRODUCT_DESCRIPTION = "DEMO DATA ONLY - temporary product for PurainaMarket order-flow testing. Not for real sale.";
const DEMO_PRODUCT_IMAGE = "https://placehold.co/600x600/png?text=Demo+Product";
const DEMO_CATEGORY_IMAGE = "https://placehold.co/96x96/png?text=Demo+Category";
const DEMO_SUBCATEGORY_IMAGE = "https://placehold.co/96x96/png?text=Demo+Subcategory";
const DEMO_SEED_ID = "purainamarket-demo-seed";
const createdDuringThisRun = [];

const hasId = (items, id) => (items || []).some((item) => item.toString() === id.toString());

const createAndTrack = async (Model, document) => {
    const created = await Model.create(document);
    createdDuringThisRun.push({ Model, id: created._id });
    return created;
};

try {
    await connectDB();

    if (process.argv.includes("--remove")) {
        const demoProduct = await ProductModel.findOne({ name: "Demo Product", "more_details.seedId": DEMO_SEED_ID });
        const demoCategory = await CategoryModel.findOne({ name: "Demo Category", image: DEMO_CATEGORY_IMAGE });
        const demoSubCategory = demoCategory
            ? await SubCategoryModel.findOne({ name: "Demo Subcategory", image: DEMO_SUBCATEGORY_IMAGE, category: demoCategory._id })
            : null;

        if (demoProduct) {
            const [hasOrder, hasCart] = await Promise.all([
                OrderModel.exists({ "itemList.productId": demoProduct._id }),
                CartProductModel.exists({ productId: demoProduct._id })
            ]);
            if (hasOrder || hasCart) {
                console.log("Demo Product is referenced by an order or cart; nothing was removed. Clear demo carts and retain order history before cleanup.");
            } else {
                await ProductModel.deleteOne({ _id: demoProduct._id, "more_details.seedId": DEMO_SEED_ID });
                console.log(`Removed Demo Product (${demoProduct._id}).`);
                if (demoSubCategory && !(await ProductModel.exists({ subCategory: demoSubCategory._id }))) {
                    await SubCategoryModel.deleteOne({ _id: demoSubCategory._id, image: DEMO_SUBCATEGORY_IMAGE });
                    console.log(`Removed Demo Subcategory (${demoSubCategory._id}).`);
                }
                if (demoCategory
                    && !(await ProductModel.exists({ category: demoCategory._id }))
                    && !(await SubCategoryModel.exists({ category: demoCategory._id }))) {
                    await CategoryModel.deleteOne({ _id: demoCategory._id, image: DEMO_CATEGORY_IMAGE });
                    console.log(`Removed Demo Category (${demoCategory._id}).`);
                }
            }
        } else {
            console.log("No Demo Product created by this seed was found; no records changed.");
        }
        process.exitCode = 0;
    } else {

        // Look up all existing demo-named records before writing, and never update them.
        let category = await CategoryModel.findOne({ name: "Demo Category" });
        let subCategory = category
            ? await SubCategoryModel.findOne({ name: "Demo Subcategory", category: category._id })
            : null;
        const conflictingSubCategory = await SubCategoryModel.findOne({ name: "Demo Subcategory" });
        const product = await ProductModel.findOne({ name: "Demo Product" });

        if (category && conflictingSubCategory && !subCategory) {
            throw new Error("Demo Subcategory already exists under a different category. No data was changed.");
        }

        if (product) {
            const exactDemoProduct = product.price === 100
                && product.stock === 100
                && product.sellingType === "packed"
                && product.publish === true
                && product.description === DEMO_PRODUCT_DESCRIPTION
                && product.more_details?.demoData === true
                && product.more_details?.seedId === DEMO_SEED_ID
                && category
                && subCategory
                && hasId(product.category, category._id)
                && hasId(product.subCategory, subCategory._id);
            if (!exactDemoProduct) {
                throw new Error("A different product named Demo Product already exists. It was left untouched; rename or inspect it before running this seed.");
            }
            console.log(`Demo data already exists; no records changed. Product ID: ${product._id}`);
        } else {
            if (!category) category = await createAndTrack(CategoryModel, { name: "Demo Category", image: DEMO_CATEGORY_IMAGE });
            if (!subCategory) subCategory = await createAndTrack(SubCategoryModel, {
                name: "Demo Subcategory",
                image: DEMO_SUBCATEGORY_IMAGE,
                category: [category._id]
            });

            const createdProduct = await createAndTrack(ProductModel, {
                name: "Demo Product",
                image: [DEMO_PRODUCT_IMAGE],
                category: [category._id],
                subCategory: [subCategory._id],
                unit: "piece",
                stock: 100,
                price: 100,
                sellingType: "packed",
                pricePerKg: null,
                description: DEMO_PRODUCT_DESCRIPTION,
                discount: 0,
                more_details: { demoData: true, seedId: DEMO_SEED_ID },
                publish: true
            });

            console.log("Temporary demo records created:");
            console.log(`Category: Demo Category (${category._id})`);
            console.log(`Subcategory: Demo Subcategory (${subCategory._id})`);
            console.log(`Product: Demo Product (${createdProduct._id})`);
            console.log(`Image: ${DEMO_PRODUCT_IMAGE}`);
        }
    }
} catch (error) {
    for (const { Model, id } of createdDuringThisRun.reverse()) {
        await Model.deleteOne({ _id: id }).catch(() => {});
    }
    console.error(`Demo seed failed: ${error.message}`);
    process.exitCode = 1;
} finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
}
