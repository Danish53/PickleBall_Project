import express from "express";
import {
  forgotPassword,
  getProfile,
  login,
  logout,
  register,
  resendOtp,
  resetPassword,
  updateProfile,
  verifyOtp,
} from "../controller/userController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { upload } from "../middleware/multerMiddleware.js";
import {
  pickleballCourts,
  searchCourts,
} from "../controller/googleMapController.js";
import {
  addCoachServices,
  addSchedule,
  getCoaches,
  getCoachSchedules,
  getCoachServices,
} from "../controller/CoatchesController.js";
import { checkBannedUser } from "../middleware/bannedUser.js"; 

const router = express.Router();

// user
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/reset-password/:userId/:otp", resetPassword);
router.get("/logout", isAuthenticated, logout);
router.get("/getprofile", isAuthenticated, checkBannedUser, getProfile);
router.put(
  "/profile/:id", 
  isAuthenticated, checkBannedUser,
  upload.single("profileAvatar"),
  updateProfile
);
//court
router.get("/pickleball-courts", isAuthenticated, checkBannedUser, pickleballCourts);
router.get("/search-courts", isAuthenticated, checkBannedUser, searchCourts);
//coaches
router.get("/coaches/:groupId", isAuthenticated, checkBannedUser, getCoaches);
router.post("/addSchedule/:coachId", isAuthenticated, checkBannedUser, addSchedule);
router.get("/getAllSchedules/:coachId", isAuthenticated, checkBannedUser, getCoachSchedules);
router.post("/addCoachServices/:coachId", isAuthenticated, checkBannedUser, addCoachServices);
router.get("/getCoachServices/:coachId", isAuthenticated, checkBannedUser, getCoachServices);

export default router;
