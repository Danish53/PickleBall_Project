import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { Category } from "../model/categoryModel.js";
import { uploadProduct } from "../model/uploadProductModel.js";
import { Users } from "../model/userModel.js";

//addCategroy admin
export const addCategory = asyncErrors(async (req, res, next) => {
  const { categoryName } = req.body;

  if (!categoryName) {
    return next(new ErrorHandler("Category name must be provided", 400));
  }

  try {
    const category = await Category.create({ categoryName });

    res.status(201).json({
      success: true,
      message: "Category added successfully",
      category,
    });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

//user & admin
export const listCategories = asyncErrors(async (req, res, next) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

//admin
export const deleteCategory = asyncErrors(async (req, res, next) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    return next(new ErrorHandler("Category ID is required", 400));
  }

  try {
    const category = await Category.findOne({ where: { id: categoryId } });

    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    const associatedProducts = await uploadProduct.findAll({
      where: { categoryId },
    });

    if (associatedProducts.length > 0) {
      return next(
        new ErrorHandler(
          "Category cannot be deleted as it is associated with products",
          400
        )
      );
    }

    await Category.destroy({ where: { id: categoryId } });

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// uploadProduct
export const uploadProducts = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("userId in parameter missing!", 400));
  }

  const { productName, brand, specification, price, categoryId } = req.body;

  if (!productName || !brand || !specification || !price || !categoryId) {
    return next(new ErrorHandler("Fill in all required fields", 400));
  }

  // Validate field lengths
  if (productName.length < 3) {
    return next(
      new ErrorHandler("Product name must be at least 3 characters long", 400)
    );
  }

  if (brand.length < 3) {
    return next(
      new ErrorHandler("Brand name must be at least 3 characters long", 400)
    );
  }

  // File upload
  const imageUrl = req.file ? req.file.path : null;

  if (!imageUrl) {
    return next(new ErrorHandler("Image uploading error!", 400));
  }

  try {
    const user = await Users.findOne({ where: { id: userId } });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const category = await Category.findOne({ where: { id: categoryId } });

    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    const product = await uploadProduct.create({
      userId,
      productName,
      brand,
      specification,
      price,
      imageUrl,
      categoryId,
    });

    res.status(200).json({
      success: true,
      message: "Product uploaded successfully",
      product,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

//search Product
export const searchProductsByCategory = asyncErrors(async (req, res, next) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    return next(new ErrorHandler("CategoryId in parameter missing!", 400));
  }

  try {
    const category = await Category.findOne({ where: { id: categoryId } });

    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    const products = await uploadProduct.findAll({
      where: { categoryId },
    });

    res.status(200).json({
      success: true,
      message: `Products retrieved for category ${category.categoryName}`,
      products,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

//all products
export const allProducts = asyncErrors(async (req, res, next) => {
  try {
    const products = await uploadProduct.findAll();
    res.status(200).json({
      success: true,
      message: "List of all Products!",
      products,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});
