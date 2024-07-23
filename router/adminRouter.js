import express from "express";
import {
  adminLogin,
  adminLogout,
  banUser,
  deleteUser,
  getAdminProfile,
  getAllUsers,
  unbanUser,
  updateAdminProfile,
  updateProfile,
} from "../controller/userController.js";
import { upload } from "../middleware/multerMiddleware.js";
import {
  allGroupsList,
  chatGroup,
  pickleballCourts,
} from "../controller/googleMapController.js";
import { isAdmin } from "../middleware/auth.js";
import {
  addCategory,
  deleteCategory,
  listCategories,
} from "../controller/marketPlaceController.js";

const routerAdmin = express.Router();

// admin
routerAdmin.post("/login", adminLogin);
routerAdmin.get("/logout", isAdmin, adminLogout);
routerAdmin.get("/profile", isAdmin, getAdminProfile);
routerAdmin.put(
  "/profile",
  isAdmin,
  upload.single("profileAvatar"),
  updateAdminProfile
);
//court
routerAdmin.get(
  "/pickleball-courts",
  isAdmin,
  pickleballCourts
);
//create Group
routerAdmin.post("/group-create/:courtId", isAdmin, chatGroup);
//all groups
routerAdmin.get("/allgroups", isAdmin, allGroupsList);
//all users
routerAdmin.get("/getAllUsers", isAdmin, getAllUsers);
routerAdmin.put(
    "/profile/:id",
    isAdmin,
    upload.single("profileAvatar"),
    updateProfile
  );
routerAdmin.delete("/deleteUser/:userId", isAdmin, deleteUser);
routerAdmin.patch("/banUser/:userId", isAdmin, banUser);
routerAdmin.patch("/unbanUser/:userId", isAdmin, unbanUser);
//marketPlace
routerAdmin.post("/addCategory", isAdmin, addCategory);
routerAdmin.delete(
  "/deleteCategory/:categoryId",
  isAdmin,
  deleteCategory
);
routerAdmin.get("/listCategory", isAdmin, listCategories);

export default routerAdmin;
