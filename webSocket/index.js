import { Op, where } from "sequelize";
import { chatGroups } from "../model/chatGroupsModel.js";
import { groupMembers } from "../model/groupMembers.js";
import { Message } from "../model/messageModel.js";
import { PrivateMessage } from "../model/privateMessage.js";
import { Users } from "../model/userModel.js";

export default (io) => {
  io.on("connection", (socket) => {
    console.log("A user connected");
    // console.log(socket, "socket");

    socket.on("userConnect", (userPhoneNumber) => {
      io.emit("userOnline", userPhoneNumber);
      console.log(userPhoneNumber, "connected");
    });

    socket.on("userDisconnect", (userPhoneNumber) => {
      io.emit("userOffline", userPhoneNumber);
    });

    // ========Group chat=========
    socket.on("joinGroup", async ({ groupId, userPhoneNumber }) => {
      try {
        const groupMember = await groupMembers.findOne({
          where: { groupId, userPhoneNumber },
        });

        if (!groupMember) {
          socket.emit("error", "You are not a member of this group");
          console.log(`Unauthorized attempt: ${userPhoneNumber} tried to join group ${groupId}`);
          return;
        }

        socket.join(groupId);
        console.log(
          `User ${userPhoneNumber} joined group ${groupId}`
        );

        const messages = await Message.findAll({
          where: { groupId },
          order: [["createdAt", "ASC"]],
          limit: 100,
        });
        socket.emit("loadMessages", messages);
      } catch (error) {
        console.error("Error loading messages:", error);
        socket.emit("error", "Failed to join the group");
      }
    });

    // Event listener for 'sendMessage'
    socket.on("sendMessage", async ({ groupId, userPhoneNumber, message }) => {
      try {
        const groupMemberss = await groupMembers.findAll({
          where: { groupId },
        });
        console.log("Fetched group members:", groupMemberss);

        if (Array.isArray(groupMemberss)) {
          const newMessage = await Message.create({
            groupId,
            userPhoneNumber,
            message,
          });
          io.to(groupId).emit("message", newMessage);

          // Send notification to group members
          groupMemberss.forEach((member) => {
            if (member.userPhoneNumber !== userPhoneNumber) {
              socket.broadcast
                .to(member.userPhoneNumber.toString())
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

    // Event listener for 'deleteMessage'
    socket.on(
      "deleteMessage",
      async ({ messageId, groupId, userPhoneNumber }) => {
        try {
          // Check if message exists
          const message = await Message.findOne({
            where: { id: messageId, groupId },
          });

          if (!message) {
            socket.emit("error", "Message not found");
            return;
          }

          // Check if the user is authorized to delete the message
          if (message.userPhoneNumber !== userPhoneNumber) {
            socket.emit("error", "You can only delete your own messages");
            return;
          }

          // Delete the message from the database
          await Message.destroy({ where: { id: messageId } });

          // Emit a delete event to all clients in the group
          io.to(groupId).emit("messageDeleted", messageId);

          // Optionally, send a notification to group members about the message deletion
          const groupMemberss = await groupMembers.findAll({
            where: { groupId },
          });
          groupMemberss.forEach((member) => {
            if (member.userPhoneNumber !== userPhoneNumber) {
              socket.broadcast
                .to(member.userPhoneNumber.toString())
                .emit("notification", {
                  type: "group",
                  groupId,
                  message: `A message was deleted in group ${groupId}`,
                });
            }
          });
        } catch (error) {
          console.error("Error deleting message:", error);
          socket.emit("error", "Failed to delete message");
        }
      }
    );

   
   
    // ========private chat=========
 
    // Event listener for 'startChat'
    socket.on(
      "startChat",
      async ({ senderPhoneNumber, receiverPhoneNumber }) => {
        try {
          // Find receiver by phone number
          const receiver = await Users.findOne({
            where: { phoneNumber: receiverPhoneNumber },
          });

          if (!receiver) {
            socket.emit("error", "Receiver not found");
            console.log(`Receiver not found: ${receiverPhoneNumber}`);
            return;
          }

          // Find sender by phone number
          const sender = await Users.findOne({
            where: { phoneNumber: senderPhoneNumber },
          });

          if (!sender) {
            socket.emit("error", "Sender not found");
            console.log(`Receiver not found: ${receiverPhoneNumber}`);
            return;
          }

          // Create a unique room based on phone numbers
          const privateRoom = [sender.phoneNumber, receiver.phoneNumber]
            .sort()
            .join("-");

          // Join the private room for both the sender and receiver
          socket.join(privateRoom);

          // Fetch chat history between the sender and receiver using phone numbers
          const messages = await PrivateMessage.findAll({
            where: {
              [Op.or]: [
                { senderPhoneNumber, receiverPhoneNumber },
                {
                  senderPhoneNumber: receiverPhoneNumber,
                  receiverPhoneNumber: senderPhoneNumber,
                },
              ],
            },
            order: [["createdAt", "ASC"]],
            limit: 50,
          });

          // Send the chat history to the client
          socket.emit("loadPrivateMessages", messages);
        } catch (error) {
          console.error("Error starting chat:", error);
          socket.emit("error", "Failed to start chat");
        }
      }
    );

    // private messages
    socket.on(
      "sendPrivateMessage",
      async ({ senderPhoneNumber, receiverPhoneNumber, message }) => {
        try {
          // Find receiver by phone number
          const receiver = await Users.findOne({
            where: { phoneNumber: receiverPhoneNumber },
          });
          if (!receiver) {
            socket.emit("error", "Receiver not found");
            return;
          }

          // Find sender by phone number
          const sender = await Users.findOne({
            where: { phoneNumber: senderPhoneNumber },
          });
          if (!sender) {
            socket.emit("error", "Sender not found");
            return;
          }

          // Save the message to the database
          const newMessage = await PrivateMessage.create({
            senderPhoneNumber: sender.phoneNumber,
            receiverPhoneNumber: receiver.phoneNumber,
            message,
          });

          // Create a unique room based on phone numbers
          const privateRoom = [sender.phoneNumber, receiver.phoneNumber]
            .sort()
            .join("-");

          // Emit the message to the private room recieve the message
          io.to(privateRoom).emit("ReceivedPrivateMessage", newMessage);

          // Optionally, you can send a notification to the receiver
          // socket.broadcast.to(receiverPhoneNumber).emit("notification", {
          //   type: "private",
          //   senderPhoneNumber: sender.phoneNumber,
          //   message: newMessage,
          // });
          socket.to(privateRoom).emit("notification", {
            type: "private",
            senderPhoneNumber: sender.phoneNumber,
            message: newMessage,
          });

        } catch (error) {
          console.error("Error sending private message:", error);
          socket.emit("error", "Failed to send message");
        }
      }
    );

    // Event listener for 'deletePrivateMessage'
    socket.on(
      "deletePrivateMessage",
      async ({ messageId, senderPhoneNumber }) => {
        try {
          // Find the message by its ID
          // const message = await PrivateMessage.findByPk(messageId);

          const message = await PrivateMessage.findOne({
            where: {
              id: messageId,
              senderPhoneNumber: senderPhoneNumber,
            },
          });

          if (!message) {
            socket.emit("error", "Message not found");
            return;
          }

          // // Find the sender by phone number
          // const sender = await Users.findOne({
          //   where: { phoneNumber: senderPhoneNumber },
          // });

          // if (!sender) {
          //   socket.emit("error", "Sender not found");
          //   return;
          // }

          // // Check if the sender is the one who sent the message
          // if (message.senderPhoneNumber !== sender.phoneNumber) {
          //   socket.emit("error", "You can only delete your own messages");
          //   return;
          // }

          // Delete the message
          await message.destroy();

          // Create a private room based on phone numbers
          const privateRoom = [
            message.senderPhoneNumber,
            message.receiverPhoneNumber,
          ]
            .sort()
            .join("-");

          // Emit an event to the room that the message has been deleted
          io.to(privateRoom).emit("deleteMessage", { messageId });
        } catch (error) {
          console.error("Error deleting private message:", error);
          socket.emit("error", "Error deleting private message");
        }
      }
    );

    socket.on("userTyping", ({ senderPhoneNumber, receiverPhoneNumber }) => {
      const privateRoom = [senderPhoneNumber, receiverPhoneNumber]
        .sort()
        .join("-");

      // Emit "typing" event to the private room
      io.to(privateRoom).emit("typing", senderPhoneNumber);
    });

    socket.on(
      "userStoppedTyping",
      ({ senderPhoneNumber, receiverPhoneNumber }) => {
        const privateRoom = [senderPhoneNumber, receiverPhoneNumber]
          .sort()
          .join("-");

        // Emit "stoppedTyping" event to the private room
        io.to(privateRoom).emit("stoppedTyping", senderPhoneNumber);
      }
    );

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // admin notify
  // io.on("connection", (socket) => {
  //   console.log("Admin connected");
  
  //   socket.on("disconnect", () => {
  //     console.log("Admin disconnected");
  //   });
  // });
  
  // return io;

};



