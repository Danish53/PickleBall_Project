import express from "express";
import {
  adminLogin,
  adminLogout,
  approveOrRejectDocument,
  banCoach,
  banUser,
  deleteCoach,
  deleteUserIndividual,
  getAdminProfile,
  getAllCoaches,
  getAllIndividual,
  getAllUsers,
  getNotificationsAdmin,
  getSingleCoache,
  groupListSingleUser,
  markNotificationAsRead,
  statusCheckDocument,
  unbanCoach,
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
  updateCategory,
} from "../controller/marketPlaceController.js";

const routerAdmin = express.Router();

// admin
routerAdmin.post("/login", adminLogin);
routerAdmin.get("/logout", isAdmin, adminLogout);
routerAdmin.get("/profile", isAdmin, getAdminProfile);
routerAdmin.put(
  "/update-profile",
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
routerAdmin.get("/getAllIndividualUser", isAdmin, getAllIndividual);
routerAdmin.get("/getAllCoaches", isAdmin, getAllCoaches);
routerAdmin.get("/getSingleCoach/:coachId", isAdmin, getSingleCoache);
routerAdmin.put(
    "/profile/:id",
    isAdmin,
    upload.single("profileAvatar"),
    updateProfile
  );
routerAdmin.delete("/deleteUser-indivudual/:userId", isAdmin, deleteUserIndividual);
routerAdmin.delete("/delete-coach/:userId", isAdmin, deleteCoach);
routerAdmin.patch("/banUser/:userId", isAdmin, banUser);
routerAdmin.patch("/unbanUser/:userId", isAdmin, unbanUser);
routerAdmin.patch("/banCoach/:coachId", isAdmin, banCoach);
routerAdmin.patch("/unbanCoach/:coachId", isAdmin, unbanCoach);
//marketPlace
routerAdmin.post("/addCategory", isAdmin, addCategory);
routerAdmin.delete( 
  "/deleteCategory/:categoryId",  
  isAdmin,
  deleteCategory
);
routerAdmin.put("/update-category/:id", isAdmin, updateCategory);
routerAdmin.get("/listCategory", isAdmin, listCategories);
routerAdmin.get("/allNotifications", isAdmin, getNotificationsAdmin);
routerAdmin.post("/notifications/mark-as-read", isAdmin, markNotificationAsRead);
routerAdmin.post("/document-approval/:userId", isAdmin, approveOrRejectDocument);
routerAdmin.get("/status-check/:userId", isAdmin, statusCheckDocument);
routerAdmin.get("/group/:userId", isAdmin, groupListSingleUser);


export default routerAdmin;
