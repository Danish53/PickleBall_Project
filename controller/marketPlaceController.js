import { col, fn, Op, Sequelize } from "sequelize";
import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { Category } from "../model/categoryModel.js";
import { uploadProduct } from "../model/uploadProductModel.js";
import { Users } from "../model/userModel.js";
import { SellerRating } from "../model/sellerRating.js";

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

export const updateCategory = asyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { categoryName } = req.body;

  if (!categoryName) {
    return next(new ErrorHandler("Category name must be provided", 400));
  }

  try {
    const category = await Category.findOne({ where: { id } });

    if (!category) {
      return next(new ErrorHandler("category not found", 404));
    }

    category.categoryName = categoryName;

    await category.save();

    res.status(201).json({
      success: true,
      message: "Category updated successfully",
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
  const imageUrl = req.file ? req.file.path.replace(/^public\//, "") : null;

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
      phoneNumber: user.phoneNumber,
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

// updateProdcut
export const updateProduct = asyncErrors(async (req, res, next) => {
  const { userId, productId } = req.params;
  const { productName, brand, specification, price, categoryId } = req.body;

  if (!userId || !productId) {
    return next(new ErrorHandler("User ID or Product ID is missing!", 400));
  }

  const imageUrl = req.file ? req.file.path.replace(/^public\//, "") : null;

  try {
    const product = await uploadProduct.findOne({
      where: { id: productId, userId },
    });
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    // Update fields if they are provided in the request
    if (productName) product.productName = productName;
    if (brand) product.brand = brand;
    if (specification) product.specification = specification;
    if (price) product.price = price;
    if (categoryId) product.categoryId = categoryId;
    if (imageUrl) product.imageUrl = imageUrl;

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
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
    const products = await uploadProduct.findAll({
      where: { userId: { [Op.ne]: req.user.id } },
      order: [["createdAt", "DESC"]],
    });

    if (products.length === 0) { 
      return next(new ErrorHandler("Products not found", 404));
    }

    const ratings = await SellerRating.findAll({
      where: {
        sellerId: { [Op.in]: products.map(product => product.userId) }, 
      },
    });

    if (ratings.length === 0) {
      return next(new ErrorHandler("No ratings found for these sellers", 404));
    }

    const sellerRatingsMap = ratings.reduce((acc, rating) => {
      if (!acc[rating.sellerId]) {
        acc[rating.sellerId] = { totalRating: 0, count: 0 };
      }
      acc[rating.sellerId].totalRating += Number(rating.rating);
      acc[rating.sellerId].count += 1;
      return acc;
    }, {});

    await Promise.all(products.map(async (product) => {
      const sellerRating = sellerRatingsMap[product.userId];
      const averageRating = sellerRating
        ? sellerRating.totalRating / sellerRating.count 
        : 0;

      await product.update({ totalRating: averageRating });
    }));

    res.status(200).json({
      success: true,
      message: "List of all Products!",
      products,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});


// single product details
export const singleProductDetails = asyncErrors(async (req, res, next) => {
  const { productId } = req.params;

  if (!productId) {
    return next(new ErrorHandler("productId in parameter missing!", 400));
  }

  try {
    const product = await uploadProduct.findOne({
      where: { id: productId },
    });

    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Product details!",
      product,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// single user products
export const singleUserProducts = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("userId in parameter missing!", 400));
  }

  try {
    const user = await Users.findOne({
      where: { id: userId },
      order: [["createdAt", "DESC"]],
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const products = await uploadProduct.findAll({ where: { userId } });

    res.status(200).json({
      success: true,
      message: "List of all Products for this user!",
      products,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});
