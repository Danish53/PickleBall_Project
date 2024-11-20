import { Op } from "sequelize";
import { groupMembers } from "../model/groupMembers.js";
import { Message } from "../model/messageModel.js";
import { PrivateMessage } from "../model/privateMessage.js";
import { Users } from "../model/userModel.js";
import { PollOptions } from "../model/pollOptionsModel.js";
import { PollVotes } from "../model/pollVotesModel.js";

export default (io) => {
  io.on("connection", async (socket) => {
    console.log("A user connected");

    socket.on("userConnect", (userPhoneNumber) => {
      io.emit("userOnline", userPhoneNumber);
      console.log(userPhoneNumber, "connected");
    });

    socket.on("userDisconnect", (userPhoneNumber) => {
      io.emit("userOffline", userPhoneNumber);
    });

    // ========Group chat=========

    // Join a group
    socket.on("joinGroup", async ({ groupId, userPhoneNumber }) => {
      try {
        const groupMember = await groupMembers.findOne({
          where: { groupId, userPhoneNumber },
        });

        if (!groupMember) {
          socket.emit("error", "You are not a member of this group");
          console.log(
            `Unauthorized attempt: ${userPhoneNumber} tried to join group ${groupId}`
          );
          return;
        }

        socket.join(groupId);
        console.log(`User ${userPhoneNumber} joined group ${groupId}`);

        const messages = await Message.findAll({
          where: { groupId },
          order: [["createdAt", "ASC"]],
          raw: true,
        });

        // Find poll message IDs
        const pollMessageIds = messages
          .filter((msg) => Number(msg.isPoll) === 1) 
          .map((msg) => msg.id);

        const pollOptions = pollMessageIds.length > 0
            ? await PollOptions.findAll({
                where: { pollId: pollMessageIds },
                attributes: ["id", "pollId", "option_text", "votes"],
                raw: true,
              })
            : [];

        const formattedMessages = messages.map((msg) => {
          // options with option id
          const options =
    Number(msg.isPoll) === 1
      ? pollOptions
          .filter((option) => option.pollId === msg.id)
          .map((option) => ({
            ...option, 
            option_id: option.id,
          }))
      : [];
          return {
            ...msg,
            options,
          };
        });

        socket.emit("loadMessages", formattedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
        socket.emit("error", `Failed to join the group: ${error.message}`);
      }
    });

    // Send a message (including poll creation)
    socket.on(
      "sendMessage",
      async ({ groupId, userPhoneNumber, message, isPoll, options }) => {
        try {
          const groupMember = await groupMembers.findOne({
            where: { groupId, userPhoneNumber },
          });

          if (!groupMember) {
            socket.emit("error", "You are not a member of this group");
            return;
          }

          // If the message is a poll
          if (isPoll) {
            const newMessage = await Message.create({
              userProfileAvatar: groupMember.profileAvatar || null,
              groupId,
              userPhoneNumber,
              message,
              isPoll,
            });

            const optionPromises = options.map((option_text) =>
              PollOptions.create({
                pollId: newMessage.id,
                option_text,
                votes: 0,
              })
            );

            await Promise.all(optionPromises);
            io.to(groupId).emit("newPoll", { message: newMessage, options });

            console.log("Poll created:", newMessage);
          } else {
            const newMessage = await Message.create({
              userProfileAvatar: groupMember.profileAvatar || null,
              groupId,
              userPhoneNumber,
              message,
              isPoll,
            });

            io.to(groupId).emit("message", newMessage);
            console.log("newMessage", newMessage);
          }
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", "Failed to send message");
        }
      }
    );

    // Voting on a poll
    socket.on("votePoll", async ({ groupId, userPhoneNumber, pollId, optionId }) => {
      try {
        // Check if the user has already voted
        const existingVote = await PollVotes.findOne({
          where: { pollId, userPhoneNumber },
        });
    
        if (existingVote) {
          // Decrement the previous option's vote count
          await PollOptions.increment("votes", {
            by: -1,
            where: { id: existingVote.selectedOptionId },
          });
    
          // Update the vote to the new option
          existingVote.selectedOptionId = optionId;
          await existingVote.save();
        } else {
          // Create a new vote
          await PollVotes.create({
            pollId,
            userPhoneNumber,
            selectedOptionId: optionId,
          });
        }
    
        // Increment the new option's vote count
        await PollOptions.increment("votes", {
          by: 1,
          where: { id: optionId },
        });
    
        // Fetch the poll question from the Message table
        const poll = await Message.findOne({
          where: { id: pollId },
          attributes: ["id", "message"], // Fetch only relevant fields
        });
    
        if (!poll) {
          socket.emit("error", "Poll not found");
          return;
        }
    
        console.log('Poll:', poll);  // Log poll data
    
        // Fetch all poll options for the given pollId
        const options = await PollOptions.findAll({
          where: { pollId },
          attributes: ["id", "option_text", "votes"],
        });
    
        console.log('Fetched Options:', options);  // Log the options
    
        if (!options.length) {
          socket.emit("error", "Poll options not found");
          return;
        }
    
        // Emit the updated poll results to the group
        io.to(groupId).emit("pollResults", {
          poll: {
            id: poll.id,
            question: poll.message,  // Correct the question field
            options: options,        // Pass the options
          },
        });
    
        console.log(
          "User voted:",
          userPhoneNumber,
          "Poll ID:",
          pollId,
          "Option ID:",
          optionId
        );
      } catch (error) {
        console.error("Error voting on poll:", error);
        socket.emit("error", "Failed to vote on poll");
      }
    });
    
    
    

    // Deleting a poll
    socket.on("deletePoll", async ({ groupId, pollId }) => {
      try {
        // Destroy the poll and related data
        await PollVotes.destroy({ where: { pollId } });
        await PollOptions.destroy({ where: { pollId } });
        await Message.destroy({ where: { id: pollId } });

        io.to(groupId).emit("pollDeleted", pollId);
        console.log("Poll deleted:", pollId);
      } catch (error) {
        console.error("Error deleting poll:", error);
        socket.emit("error", "Failed to delete poll");
      }
    });

    // Join a group
    // socket.on("joinGroup", async ({ groupId, userPhoneNumber }) => {
    //   try {
    //     const groupMember = await groupMembers.findOne({
    //       where: { groupId, userPhoneNumber },
    //     });

    //     if (!groupMember) {
    //       socket.emit("error", "You are not a member of this group");
    //       console.log(
    //         `Unauthorized attempt: ${userPhoneNumber} tried to join group ${groupId}`
    //       );
    //       return;
    //     }

    //     socket.join(groupId);
    //     console.log(`User ${userPhoneNumber} joined group ${groupId}`);

    //     const messages = await Message.findAll({
    //       where: { groupId },
    //       order: [["createdAt", "ASC"]],
    //     });
    //     socket.emit("loadMessages", messages);
    //   } catch (error) {
    //     console.error("Error loading messages:", error);
    //     socket.emit("error", "Failed to join the group");
    //   }
    // });

    // socket.on("sendMessage", async ({ groupId, userPhoneNumber, message }) => {
    //   try {
    //     const groupMemberss = await groupMembers.findAll({
    //       where: { groupId, userPhoneNumber },
    //     });

    //     if (Array.isArray(groupMemberss)) {
    //       const newMessage = await Message.create({
    //         userProfileAvatar: groupMemberss
    //           ? groupMemberss.profileAvatar
    //           : null,
    //         groupId,
    //         userPhoneNumber,
    //         message,
    //       });

    //       io.to(groupId).emit("message", newMessage);

    //       console.log("newMessage", newMessage);

    //       // groupMemberss.forEach((member) => {
    //       //   if (member.userPhoneNumber !== userPhoneNumber) {
    //       //     // Broadcasting notification to each member in their own room
    //       //     console.log(`Sending notification to user: ${member.userPhoneNumber}`);
    //       //     socket.broadcast
    //       //       .to(member.userPhoneNumber.toString())
    //       //       .emit("notification", {
    //       //         type: "group",
    //       //         groupId,
    //       //         message: newMessage,
    //       //       });
    //       //   }
    //       // });
    //     } else {
    //       console.error(
    //         "No group members found or result is not an array:",
    //         groupMemberss
    //       );
    //     }
    //   } catch (error) {
    //     console.error("Error sending message:", error.stack);
    //   }
    // });

    // socket.on(
    //   "deleteMessage",
    //   async ({ messageId, groupId, userPhoneNumber }) => {
    //     try {
    //       // Check if message exists
    //       const message = await Message.findOne({
    //         where: { id: messageId, groupId },
    //       });

    //       if (!message) {
    //         socket.emit("error", "Message not found");
    //         return;
    //       }

    //       // Check if the user is authorized to delete the message
    //       if (message.userPhoneNumber !== userPhoneNumber) {
    //         socket.emit("error", "You can only delete your own messages");
    //         return;
    //       }

    //       // Delete the message from the database
    //       await Message.destroy({ where: { id: messageId } });

    //       // Emit a delete event to all clients in the group
    //       io.to(groupId).emit("messageDeleted", messageId);

    //       // Optionally, send a notification to group members about the message deletion
    //       const groupMemberss = await groupMembers.findAll({
    //         where: { groupId },
    //       });
    //       groupMemberss.forEach((member) => {
    //         if (member.userPhoneNumber !== userPhoneNumber) {
    //           socket.broadcast
    //             .to(member.userPhoneNumber.toString())
    //             .emit("notification", {
    //               type: "group",
    //               groupId,
    //               message: `A message was deleted in group ${groupId}`,
    //             });
    //         }
    //       });
    //     } catch (error) {
    //       console.error("Error deleting message:", error);
    //       socket.emit("error", "Failed to delete message");
    //     }
    //   }
    // );

    // // polls group
    // socket.on(
    //   "createPoll",
    //   async ({ groupId, userPhoneNumber, message, options }) => {
    //     try {
    //       // let time = new Date();
    //       // time.setDate(time.getDate() + 1);
    //       // time.setHours(0, 0, 0, 0);
    //       // const poll = await Message.create({
    //       //   // groupId,
    //       //   // question,
    //       //   // created_by: userPhoneNumber,
    //       //   // expiration_time: time, // 1 day
    //       // });

    //       const groupMemberss = await groupMembers.findAll({
    //         where: { groupId, userPhoneNumber },
    //       });

    //       if (Array.isArray(groupMemberss)) {
    //         const newMessage = await Message.create({
    //           userProfileAvatar: groupMemberss
    //             ? groupMemberss.profileAvatar
    //             : null,
    //           groupId,
    //           userPhoneNumber,
    //           message,
    //         });

    //         io.to(groupId).emit("message", newMessage);

    //       } else {
    //         console.error(
    //           "No group members found or result is not an array:",
    //           groupMemberss
    //         );
    //       }

    //       const optionPromises = options.map((option_text) =>
    //         PollOptions.create({ pollId: groupMemberss.id, option_text, votes: 0 })
    //       );
    //       await Promise.all(optionPromises);

    //       io.to(groupId).emit("newPoll", groupMemberss);

    //       console.log("Poll created:", groupMemberss);
    //     } catch (error) {
    //       console.error("Error creating poll:", error.stack);
    //     }
    //   }
    // );

    // socket.on(
    //   "votePoll",
    //   async ({ groupId, userPhoneNumber, pollId, optionId }) => {
    //     try {
    //       const existingVote = await PollVotes.findOne({
    //         where: { pollId, userPhoneNumber },
    //       });

    //       if (existingVote) {
    //         return socket.emit(
    //           "voteError",
    //           "You have already voted on this poll."
    //         );
    //       }

    //       await PollVotes.create({
    //         pollId,
    //         userPhoneNumber,
    //         selectedOptionId: optionId,
    //       });

    //       await PollOptions.increment("votes", {
    //         by: 1,
    //         where: { id: optionId },
    //       });

    //       const poll = await Message.findOne({
    //         where: { id: pollId },
    //         include: [PollOptions],
    //       });

    //       io.to(groupId).emit("pollResults", poll);

    //       console.log(
    //         "User voted:",
    //         userPhoneNumber,
    //         "Poll ID:",
    //         pollId,
    //         "Option ID:",
    //         optionId
    //       );
    //     } catch (error) {
    //       console.error("Error voting on poll:", error.stack);
    //     }
    //   }
    // );

    // socket.on("deletePoll", async ({ groupId, pollId }) => {
    //   try {
    //     await Polls.destroy({ where: { id: pollId } });
    //     await PollOptions.destroy({ where: { pollId } });
    //     await PollVotes.destroy({ where: { pollId } });
    //     io.to(groupId).emit("pollDeleted", pollId);
    //     console.log("Poll deleted:", pollId);
    //   } catch (error) {
    //     console.error("Error deleting poll:", error.stack);
    //   }
    // });

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

          console.log(sender.profileAvatar, "profileAvatar");

          // Save the message to the database
          const newMessage = await PrivateMessage.create({
            senderProfileAvatar: sender.profileAvatar,
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
          console.log("Error sending private message:", error);
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
};
