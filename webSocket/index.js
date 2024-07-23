import { Op, where } from "sequelize";
import { chatGroups } from "../model/chatGroupsModel.js";
import { groupMembers } from "../model/groupMembers.js";
import { Message } from "../model/messageModel.js";
import { PrivateMessage } from "../model/privateMessage.js";
import { Users } from "../model/userModel.js";

export default (io) => {
  io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("userConnect", (userId) => {
      io.emit("userOnline", userId);
    });

    socket.on("userDisconnect", (userId) => {
      io.emit("userOffline", userId);
    });

    socket.on("joinGroup", async ({ groupId, userId }) => {
      try {
        const groupMember = await groupMembers.findOne({
          where: { groupId, userId },
        });

        if (!groupMember) {
          socket.emit("error", "You are not a member of this group");
          return;
        }

        socket.join(groupId);
        console.log(`User ${groupMember.userId} joined group ${groupId}`);

        const messages = await Message.findAll({ where: { groupId }, 
          order: [["createdAt", "ASC"]], 
          limit: 100 });
        socket.emit("loadMessages", messages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    });

    // Event listener for 'sendMessage'
    socket.on("sendMessage", async ({ groupId, userId, message }) => {
      try {
        const groupMemberss = await groupMembers.findAll({
          where: { groupId },
        });
        console.log("Fetched group members:", groupMemberss);

        if (Array.isArray(groupMemberss)) {
          const newMessage = await Message.create({ groupId, userId, message });
          io.to(groupId).emit("message", newMessage);

          // Send notification to group members
          groupMemberss.forEach((member) => {
            if (member.userId !== userId) {
              socket.broadcast
                .to(member.userId.toString())
                .emit("notification", {
                  type: "group",
                  groupId,
                  message: newMessage,
                });
            }
          });
        } else {
          console.error("groupMemberss is not an array:", groupMemberss);
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    socket.on("startChat", async ({ senderId, receiverPhoneNumber }) => {
      try {
        // const sender = await Users.findByPk(senderId);
        const receiver = await Users.findOne({
          where: { phoneNumber: receiverPhoneNumber },
        });

        if (!receiver) {
          socket.emit("error", "Receiver not found");
          return;
        }

        const privateRoomSenderToReceiver = [senderId, receiver.id]
          .sort()
          .join("-");
        const privateRoomReceiverToSender = [receiver.id, senderId]
          .sort()
          .join("-");

        socket.join(privateRoomSenderToReceiver);
        socket.join(privateRoomReceiverToSender);

        const messages = await PrivateMessage.findAll({
          where: {
            [Op.or]: [
              { senderId, receiverId: receiver.id },
              { senderId: receiver.id, receiverId: senderId },
            ],
          },
          order: [["createdAt", "ASC"]],
        });

        socket.emit("loadPrivateMessages", messages);
      } catch (error) {
        console.error("Error starting chat:", error);
      }
    });

    socket.on("sendPrivateMessage", async ({ senderId, receiverPhoneNumber, message }) => {
      try {
        const receiver = await Users.findOne({ where: { phoneNumber: receiverPhoneNumber } });
  
        if (!receiver) {
          socket.emit("error", "Receiver not found");
          return;
        }
  
        const newMessage = await PrivateMessage.create({
          senderId,
          receiverId: receiver.id,
          message,
        });
  
        const privateRoom = [senderId, receiver.id].sort().join("-");
  
        io.to(privateRoom).emit("privateMessage", newMessage);
  
        // Send notification to receiver
        socket.broadcast.to(receiver.id.toString()).emit("notification", {
          type: "private",
          senderId,
          message: newMessage,
        });
      } catch (error) {
        console.error("Error sending private message:", error);
      }
    });
  
    socket.on("deletePrivateMessage", async ({ messageId, senderId }) => {
      try {
        const message = await PrivateMessage.findByPk(messageId);
  
        if (!message) {
          socket.emit("error", "Message not found");
          return;
        }
  
        if (message.senderId !== senderId) {
          socket.emit("error", "You can only delete your own messages");
          return;
        }
  
        await message.destroy();
  
        const privateRoom = [message.senderId, message.receiverId].sort().join("-");
        io.to(privateRoom).emit("deleteMessage", { messageId });
      } catch (error) {
        console.error("Error deleting private message:", error);
        socket.emit("error", "Error deleting private message");
      }
    });

    socket.on("userTyping", ({ senderId, receiverId }) => {
      const privateRoomSenderToReceiver = [senderId, receiverId]
        .sort()
        .join("-");
      const privateRoomReceiverToSender = [receiverId, senderId]
        .sort()
        .join("-");

      io.to(privateRoomSenderToReceiver).emit("typing", senderId);
      io.to(privateRoomReceiverToSender).emit("typing", senderId);
    });

    socket.on("userStoppedTyping", ({ senderId, receiverId }) => {
      const privateRoomSenderToReceiver = [senderId, receiverId]
        .sort()
        .join("-");
      const privateRoomReceiverToSender = [receiverId, senderId]
        .sort()
        .join("-");

      io.to(privateRoomSenderToReceiver).emit("stoppedTyping", senderId);
      io.to(privateRoomReceiverToSender).emit("stoppedTyping", senderId);
    });

    // WebRTC Signaling

    // socket.on("offer", async (data) => {
    //   const { senderId, receiverPhoneNumber, offer } = data;

    //   const receiver = await Users.findOne({
    //     where: { phoneNumber: receiverPhoneNumber },
    //   });

    //   if (!receiver) {
    //     socket.emit("error", "Receiver not found");
    //     return;
    //   }
    //   io.to(receiver.id.toString()).emit("offer", { senderId, offer });
    // });

    // socket.on("answer", async (data) => {
    //   const { senderId, receiverPhoneNumber, answer } = data;

    //   const receiver = await Users.findOne({
    //     where: { phoneNumber: receiverPhoneNumber },
    //   });

    //   if (!receiver) {
    //     socket.emit("error", "Receiver not found");
    //     return;
    //   }

    //   io.to(senderId.toString()).emit("answer", {
    //     receiverId: receiver.id,
    //     answer,
    //   });
    // });

    // socket.on("ice-candidate", async (data) => {
    //   const { senderId, receiverPhoneNumber, candidate } = data;

    //   const receiver = await Users.findOne({
    //     where: { phoneNumber: receiverPhoneNumber },
    //   });

    //   if (!receiver) {
    //     socket.emit("error", "Receiver not found");
    //     return;
    //   }

    //   io.to(receiver.id.toString()).emit("ice-candidate", {
    //     senderId,
    //     candidate,
    //   });
    // });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};
