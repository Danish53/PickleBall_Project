import express from "express";
import {
  documentUpload,
  forgotPassword,
  getDocumentsVerify,
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
  createGroup,
  getCourtDetails,
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
router.post("/document-upload/:userId", upload.fields([
  { name: 'government_issue_image', maxCount: 1 },
  { name: 'certificate', maxCount: 1 },
]), documentUpload);
router.get("/docuemnt-approved-check/:userId", getDocumentsVerify);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/reset-password", resetPassword);
router.get("/logout", isAuthenticated, logout);
router.get("/getprofile", isAuthenticated, checkBannedUser, getProfile);
router.post(
  "/profile/:id", 
  isAuthenticated, checkBannedUser, 
  upload.single("profileAvatar"),
  updateProfile
);
//court
router.get("/pickleball-courts", isAuthenticated, checkBannedUser, pickleballCourts);
router.get("/search-courts/:latitude/:longitude", isAuthenticated, checkBannedUser, searchCourts);
router.get("/court-detail/:place_id", isAuthenticated, checkBannedUser, getCourtDetails);
router.get("/create-group/:place_id/:userId", isAuthenticated, checkBannedUser, createGroup);
//coaches
router.get("/coaches/:groupId", isAuthenticated, checkBannedUser, getCoaches);
router.post("/addSchedule/:coachId", isAuthenticated, checkBannedUser, addSchedule);
router.get("/getAllSchedules/:coachId", isAuthenticated, checkBannedUser, getCoachSchedules);
router.post("/addCoachServices/:coachId", isAuthenticated, checkBannedUser, addCoachServices);
router.get("/getCoachServices/:coachId", isAuthenticated, checkBannedUser, getCoachServices);

export default router;
