import { Op, where } from "sequelize";
import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { Tournaments } from "../model/tournamentModel.js";
import { Users } from "../model/userModel.js";
import { joinTournaments } from "../model/joinTournamentModel.js";
import nodemailer from "nodemailer";
import { Requests } from "../model/requestModel.js";

export const createTournament = asyncErrors(async (req, res, next) => {
  const {
    tournament_name,
    tournament_type,
    start_date,
    end_date,
    court_name,
    max_players,
    min_rating,
    max_rating,
  } = req.body;
  if (
    !tournament_name ||
    !tournament_type ||
    !start_date ||
    !end_date ||
    !court_name ||
    !max_players ||
    !min_rating ||
    !max_rating
  ) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  if (
    tournament_type !== "leagues" &&
    tournament_type !== "round robin" &&
    tournament_type !== "double eleminations"
  ) {
    return next(new ErrorHandler("Tournament type mismatch!", 400));
  }

  try {
    const user = await Users.findOne({ where: { id: req.user.id } });
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const currentDate = new Date();
    const formattedEndDate = new Date(end_date);
    if (currentDate > formattedEndDate) {
      return next(
        new ErrorHandler("End date must be greater than current date", 400)
      );
    }

    const tournament = await Tournaments.create({
      tournament_name,
      tournament_type,
      start_date,
      end_date,
      court_name,
      created_by: user.id,
      max_players,
      min_rating,
      max_rating,
    });

    await joinTournaments.create({
      tournamentId: tournament.id,
      userId: user.id,
      tournament_name: tournament.tournament_name,
      tournament_type: tournament.tournament_type,
      end_date: tournament.end_date,
    });

    const totalMembers = await joinTournaments.findAll({
      where: { tournamentId: tournament.id },
    });

    tournament.setDataValue("totalMembers", totalMembers.length.toString());

    return res.status(200).json({
      success: true,
      message: "Tournament created successfully!",
      tournament,
    });
  } catch (error) {
    console.error("Error creating tournament:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export const allTournaments = asyncErrors(async (req, res, next) => {
  try {
    const current_date = new Date();
    current_date.setHours(0, 0, 0, 0); // Set to midnight for accurate comparison

    // Fetch tournaments with end_date >= current_date
    const tournaments = await Tournaments.findAll({
      where: {
        end_date: { [Op.gte]: current_date },
      },
    });

    if (tournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No tournaments found!",
      });
    }

    // Add totalMembers for each tournament
    const tournamentsWithMembers = await Promise.all(
      tournaments.map(async (tournament) => {
        const totalMembers = await joinTournaments.count({
          where: { tournamentId: tournament.id },
        });
        tournament.setDataValue("totalMembers", totalMembers);
        return tournament;
      })
    );

    return res.status(200).json({
      success: true,
      message: "All tournaments",
      totalTournaments: tournamentsWithMembers.length,
      tournaments: tournamentsWithMembers,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export const singleUserTournaments = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;
  try {
    const user = await Users.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No users found!",
      });
    }

    const formatDate = (date) => {
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const yy = String(date.getFullYear()).slice(-2);
      return `${mm}-${dd}-${yy}`;
    };

    const current_date = new Date();
    current_date.setHours(0, 0, 0, 0);
    const formattedCurrentDate = formatDate(current_date);

    const tournaments = await Tournaments.findAll({
      where: {
        end_date: { [Op.gte]: current_date },
        created_by: userId,
      },
    });

    const filteredTournaments = tournaments.filter((tournament) => {
      const tournamentEndDate = new Date(tournament.end_date);
      tournamentEndDate.setHours(0, 0, 0, 0);
      const formattedEndDate = formatDate(tournamentEndDate);
      return formattedEndDate >= formattedCurrentDate;
    });

    if (filteredTournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No tournamnets found!",
      });
    }

    for (let tournament of filteredTournaments) {
      const totalMembersCount = await joinTournaments.count({
        where: { tournamentId: tournament.id },
      });

      tournament.setDataValue("totalMembers", totalMembersCount.toString());
    }
    let totalTournaments = filteredTournaments.length;

    return res.status(200).json({
      success: true,
      message: "Single user tournaments",
      totalTournaments,
      tournaments,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export const joinTournament = asyncErrors(async (req, res, next) => {
  const { tournamentId } = req.params;
  const user = await Users.findOne({ where: { id: req.user.id } });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  try {
    const tournament = await Tournaments.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return next(new ErrorHandler("Tournament not found", 404));
    }

    if (
      user.user_rating < tournament.min_rating ||
      user.user_rating > tournament.max_rating
    ) {
      return next(
        new ErrorHandler("You are not eligible to join this tournament", 400)
      );
    }

    const joinedUsers = await joinTournaments.findAll({
      where: { tournamentId },
    });

    if (joinedUsers.length >= tournament.max_players) {
      return next(new ErrorHandler("Tournament is already full", 400));
    }

    const alreadyJoined = joinedUsers.find((users) => users.userId === user.id);
    if (alreadyJoined) {
      return next(
        new ErrorHandler("You have already joined this tournament", 400)
      );
    }

    console.log(
      joinedUsers.map((user) => user.userId === user.id),
      "joined users"
    );

    const joinedTournament = await joinTournaments.create({
      tournamentId,
      userId: user.id,
      tournament_name: tournament.tournament_name,
      tournament_type: tournament.tournament_type,
      end_date: tournament.end_date,
    });

    const totalMembers = await joinTournaments.findAll({
      where: { tournamentId: tournament.id },
    });
    joinedTournament.setDataValue(
      "totalMembers",
      totalMembers.length.toString()
    );

    return res.status(200).json({
      success: true,
      message: "Tournament joined successfully!",
      joinedTournament,
    });
  } catch (error) {
    console.error("Error joining tournament:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export const joinedTournamentsUsers = asyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  try {
    const user = await Users.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No users found!",
      });
    }

    const formatDate = (date) => {
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const yy = String(date.getFullYear()).slice(-2);
      return `${mm}-${dd}-${yy}`;
    };

    const current_date = new Date();
    current_date.setHours(0, 0, 0, 0);
    const formattedCurrentDate = formatDate(current_date);

    const joinedTournaments = await joinTournaments.findAll({
      where: { userId: userId, end_date: { [Op.gte]: current_date } },
    });

    const filteredTournaments = joinedTournaments.filter((tournament) => {
      const tournamentEndDate = new Date(tournament.end_date);
      tournamentEndDate.setHours(0, 0, 0, 0);
      const formattedEndDate = formatDate(tournamentEndDate);
      return formattedEndDate >= formattedCurrentDate;
    });

    if (filteredTournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No tournamnets found!",
      });
    }

    if (filteredTournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No tournamnets found!",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Joined tournaments",
      joinedTournaments,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// request to players
export const allPlayers = asyncErrors(async (req, res, next) => {
  try {
    const Individual = await Users.findAll({
      // without current user
      where: { id: { [Op.ne]: req.user.id }, userType: "individual" },
    });

    let totalIndividualUser = Individual.length;

    if (Individual.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No coaches found",
      });
    }

    res.status(200).json({
      success: true,
      message: "All players retrieved successfully",
      totalIndividualUser,
      Individual,
    });
  } catch (error) {
    console.error("Error retrieving players:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const sendRequestToPlayers = asyncErrors(async (req, res, next) => {
  try {
    const { userId, tournamentId } = req.params;
    const { requestIds } = req.body;

    if (!userId || !tournamentId) {
      return res.status(400).json({
        success: false,
        message: "User ID and tournament ID are required",
      });
    }

    const sender = await Users.findOne({ where: { id: userId } });
    if (!sender) {
      return res
        .status(404)
        .json({ success: false, message: "Sender not found" });
    }

    const users = await Users.findAll({ where: { id: requestIds } });

    if (!requestIds || requestIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Request IDs are required" });
    }

    const userIdsFromDb = users.map((user) => user.id);

    // Identify any invalid IDs
    const invalidIds = requestIds.filter((id) => !userIdsFromDb.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The following IDs do not exist: ${invalidIds.join(", ")}`,
      });
    }

    const current_date = new Date();
    current_date.setHours(0, 0, 0, 0);

    const tournamentData = await Tournaments.findOne({
      where: {
        id: tournamentId,
        created_by: userId,
        end_date: { [Op.gte]: current_date },
      },
    });
    if (!tournamentData) {
      return res
        .status(404)
        .json({ success: false, message: "Tournament not found" });
    }

    const tournament = await Tournaments.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return res
        .status(404)
        .json({ success: false, message: "Tournament not found" });
    }

    const tournamentCreator = await Users.findOne({
      where: { id: tournament.created_by },
    });

    // Process each receiver ID
    const results = await Promise.all(
      requestIds.map(async (receiverId) => {
        const receiver = await Users.findOne({ where: { id: receiverId } });
        if (!receiver) {
          return {
            receiverId,
            status: "failed",
            message: "Receiver not found",
          };
        }

        const existingRequest = await Requests.findOne({
          where: { senderId: sender.id, receiverId, tournamentId },
        });

        if (existingRequest) {
          return {
            receiverId,
            status: "failed",
            message: "Request already exists",
          };
        }

        const newRequest = await Requests.create({
          senderId: sender.id,
          receiverId,
          tournamentId,
          status: 0, // 0 for pending
        });

        await sendEmail(
          tournamentCreator.email,
          `Tournament Request from ${sender.userName}`,
          `Hello ${receiver.userName},
          
          ${sender.userName} has invited you to participate in a tournament. 
          
          Tournament Details:
          - Name: ${tournament.tournament_name}
          - Type: ${tournament.tournament_type}
          - Start Date: ${tournament.start_date.toString()}
          - End Date: ${tournament.end_date.toString()}
          - Court Name: ${tournament.court_name}
          - Max Players: ${tournament.max_players}
          - Min Rating: ${tournament.min_rating}
          - Max Rating: ${tournament.max_rating}

          Please accept this request by visiting your account.

          Thank you
        `
        );

        return {
          receiverId,
          status: "success",
          message: "Request sent successfully",
          request: newRequest,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Requests processed successfully",
      results,
    });
  } catch (error) {
    console.error("Error sending requests:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const getRequests = asyncErrors(async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const requests = await Requests.findAll({
      where: { receiverId: userId, status: 0 },
    });

    res.status(200).json({
      success: true,
      message: "Requests fetched successfully",
      requests,
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

export const acceptOrRejectRequest = asyncErrors(async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!requestId || status === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Request ID or status is required" });
    }

    if (status !== 1 && status !== 2) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value!" });
    }

    const user = await Users.findOne({ where: { id: req.user.id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const request = await Requests.findOne({ where: { id: requestId } });
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }

    const tournament = await Tournaments.findOne({
      where: { id: request.tournamentId },
    });

    if (!tournament) {
      return res
        .status(404)
        .json({ success: false, message: "Tournament not found" });
    }

    const tournamentCreator = await Users.findOne({
      where: { id: tournament.created_by },
    });

    if (!tournamentCreator) {
      return res
        .status(404)
        .json({ success: false, message: "Tournament creator not found" });
    }

    let joinedTournament = null;
    if (status === 1) {
      if (tournament.created_by === req.user.id) {
        return res.status(400).json({
          success: false,
          message: "You cannot accept or reject your own request",
        });
      }

      if (
        user.user_rating < tournament.min_rating ||
        user.user_rating > tournament.max_rating
      ) {
        return res.status(400).json({
          success: false,
          message: "You are not eligible to join this tournament",
        });
      }

      const joinedUsers = await joinTournaments.findAll({
        where: { tournamentId: request.tournamentId },
      });

      if (joinedUsers.length >= tournament.max_players) {
        return res.status(400).json({
          success: false,
          message: "Tournament is already full",
        });
      }

      const alreadyJoined = joinedUsers.some(
        (users) => users.userId === user.id
      );
      if (alreadyJoined) {
        return res.status(400).json({
          success: false,
          message: "You have already joined this tournament",
        });
      }

      joinedTournament = await joinTournaments.create({
        tournamentId: tournament.id,
        userId: user.id,
        tournament_name: tournament.tournament_name,
        tournament_type: tournament.tournament_type,
        end_date: tournament.end_date,
      });

      const totalMembers = await joinTournaments.count({
        where: { tournamentId: tournament.id },
      });
      joinedTournament.setDataValue("totalMembers", totalMembers.toString());
    }

    if (status === 2) {
      request.status = 2;
      await request.save();

      // Send email notification
      await sendEmail(
        tournamentCreator.email,
        "Tournament Request Rejected",
        `The player ${user.userName} has rejected the request for the tournament: ${tournament.tournament_name}.`
      );

      return res.status(200).json({
        success: true,
        message: "Player request rejected successfully",
      });
    }

    request.status = 1;
    await request.save();

    // Send email notification
    await sendEmail(
      tournamentCreator.email,
      "Tournament Request Accepted",
      `The player ${user.userName} has accepted the request for the tournament: ${tournament.tournament_name}.`
    );

    return res.status(200).json({
      success: true,
      message: "Request accepted successfully!",
      joinedTournament,
    });
  } catch (error) {
    console.error("Error accepting/rejecting request:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error", error });
  }
});

// Helper function to send emails
const sendEmail = async (recipient, subject, message) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.PASS,
      },
    });

    await transporter.sendMail({
      from: `"Reguards Team" <${process.env.USER_EMAIL}>`,
      to: recipient,
      subject: subject,
      text: message,
    });

    console.log(`Email sent to ${recipient}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
