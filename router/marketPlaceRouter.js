import express from "express";
import { upload } from "../middleware/multerMiddleware.js";
import { isAuthenticated } from "../middleware/auth.js";
import {
  allProducts,
  listCategories,
  searchProductsByCategory,
  singleProductDetails,
  singleUserProducts,
  updateProduct,
  uploadProducts,
} from "../controller/marketPlaceController.js";
import { checkBannedUser } from "../middleware/bannedUser.js";

const productroutes = express.Router();

// marketPlace
productroutes.post(
  "/productupload/:userId",
  isAuthenticated,
  checkBannedUser,
  upload.single("imageUrl"),
  uploadProducts
);
productroutes.post(
  "/productupdate/:userId/:productId",
  isAuthenticated,
  checkBannedUser,
  upload.single("imageUrl"),
  updateProduct
);
productroutes.get("/listCategory", isAuthenticated, checkBannedUser, listCategories);
productroutes.get(
  "/searchProductsByCategory/:categoryId",
  isAuthenticated,
  checkBannedUser,
  searchProductsByCategory
);
productroutes.get("/allProducts", isAuthenticated, checkBannedUser, allProducts);
productroutes.get("/single-user-products/:userId", isAuthenticated, checkBannedUser, singleUserProducts);
productroutes.get("/single-product/:productId", isAuthenticated, checkBannedUser, singleProductDetails);

export default productroutes;
