import express from "express";
import { joinGroup } from "../controller/chatController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { checkBannedUser } from "../middleware/bannedUser.js";

const chatRoutes = express.Router();

// chat
// chatRoutes.post("/accessChat", isAuthenticated, accessChat);
// chatRoutes.get("/chats", isAuthenticated, fetchChats);
//groupChat
chatRoutes.post("/join-group/:courtId", isAuthenticated, checkBannedUser, joinGroup);

// chatRoutes.post("/send-message", isAuthenticated, sendMessage);

export default chatRoutes;
