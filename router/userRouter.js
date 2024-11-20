import express from "express";
import {
  documentUpload,
  forgotPassword,
  getDocumentsVerify,
  getProfile,
  listUsersWhoSentMessages,
  login,
  logout,
  messageStatusReadOrNot,
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
  singleUserGroups,
} from "../controller/googleMapController.js";
import {
  addCoachServices, 
  addSchedule,
  getCoaches,
  getCoachSchedules,
  getCoachServices,
} from "../controller/CoatchesController.js";
import { checkBannedUser } from "../middleware/bannedUser.js"; 
import { addSellerRating } from "../controller/sellerRatingController.js";

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
router.post("/create-group/:place_id/:userId", isAuthenticated, checkBannedUser, createGroup);
//coaches
router.get("/coaches/:groupId", isAuthenticated, checkBannedUser, getCoaches);
router.post("/addSchedule/:coachId", isAuthenticated, checkBannedUser, addSchedule);
router.get("/getAllSchedules/:coachId", isAuthenticated, checkBannedUser, getCoachSchedules);
router.post("/addCoachServices/:coachId", isAuthenticated, checkBannedUser, addCoachServices);
router.get("/getCoachServices/:coachId", isAuthenticated, checkBannedUser, getCoachServices);
router.get("/get-chats/:receiverPhoneNumber", isAuthenticated, checkBannedUser, listUsersWhoSentMessages);
router.post("/message-status/:receiverPhoneNumber/:messageStatus", isAuthenticated, checkBannedUser, messageStatusReadOrNot);

// sellers ratings
router.post("/rating/:sellerId", isAuthenticated, checkBannedUser, addSellerRating); 

// groups
router.get("/single-user-groups/:userId", isAuthenticated, checkBannedUser, singleUserGroups);


// router.get("/messages/:userPhoneNumber", getPrivateMessages);

export default router;
