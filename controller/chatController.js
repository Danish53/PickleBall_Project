import { Op, where } from "sequelize";
import { asyncErrors } from "../middleware/asyncErrors.js";
import { Users } from "../model/userModel.js";
import { chatGroups } from "../model/chatGroupsModel.js";
import ErrorHandler from "../middleware/error.js";
import { groupMembers } from "../model/groupMembers.js";

//user
export const joinGroup = asyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const { courtId } = req.params;

  if (!courtId) {
    return next(new ErrorHandler("Court ID must be provided", 400));
  }

  try {
    let user = await Users.findByPk(userId);
    console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the group already exists based on courtId, create if not
    let group = await chatGroups.findOne({ where: { courtId } });
    if (!group) {
      return next(new ErrorHandler("Group not Found", 400));
    }

    // Check if the user is already a member of any group
    const existingMembership = await groupMembers.findOne({
      where: { userPhoneNumber: user.phoneNumber },
    });
    if (existingMembership) {
      return next(
        new ErrorHandler("User is already a member of another group", 400)
      );
    }

    // Check if the user is already a member of the group
    const isMember = await groupMembers.findOne({
      where: { groupId: group.id, userPhoneNumber: user.phoneNumber },
    });
    if (isMember) {
      return next(new ErrorHandler("User already exist in this Number!", 400));
    }

    let members = await groupMembers.create({
      groupId: group.id,
      userId: user.id,
      userPhoneNumber: user.phoneNumber,
      userName: user.userName,
      userType: user.userType,
      profileAvatar: user.profileAvatar,
    });

    res.status(200).json({
      success: true,
      message: "User joined the group successfully",
      members,
    });
  } catch (error) {
    console.error("Error joining group:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

// export const sendMessage = asyncErrors(async (req, res, next, io) => {
//   const { groupId, userId, message } = req.body;

//   const groupMember = await groupMembers.findOne({
//     where: { groupId, userId },
//   });
//   if (!groupMember) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Invalid groupId or userId!" });
//   }

//   const newMessage = await Message.create({
//     groupId,
//     userId,
//     message,
//     timestamp: Date.now(),
//   });
//   req.io.to(groupId).emit("message", newMessage);

//   res.status(200).json({ success: true, message: newMessage });
// });
