import express from "express";
import { upload } from "../middleware/multerMiddleware.js";
import { isAuthenticated } from "../middleware/auth.js";
import {
  allProducts,
  listCategories,
  searchProductsByCategory,
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
productroutes.get("/listCategory", isAuthenticated, checkBannedUser, listCategories);
productroutes.get(
  "/searchProductsByCategory/:categoryId",
  isAuthenticated,
  checkBannedUser,
  searchProductsByCategory
);
productroutes.get("/allProducts", isAuthenticated, checkBannedUser, allProducts);

export default productroutes;
