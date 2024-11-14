import { Op, where } from "sequelize";
import { asyncErrors } from "../middleware/asyncErrors.js";
import ErrorHandler from "../middleware/error.js";
import { Tournaments } from "../model/tournamentModel.js";
import { Users } from "../model/userModel.js";
import { joinTournaments } from "../model/joinTournamentModel.js";

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

  if (tournament_type !== "leagues" && tournament_type !== "round robin") {
    return next(new ErrorHandler("Tournament type mismatch!", 400));
  }

  try {
    const user = await Users.findOne({ where: { id: req.user.id } });
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
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
  const formatDate = (date) => {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${mm}-${dd}-${yy}`;
  };

  try {
    const current_date = new Date();
    current_date.setHours(0, 0, 0, 0);
    const formattedCurrentDate = formatDate(current_date);

    const tournaments = await Tournaments.findAll({
      end_date: { [Op.gte]: current_date },
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

    let totalTournaments = filteredTournaments.length;

    return res.status(200).json({
      success: true,
      message: "All tournaments",
      totalTournaments,
      tournaments: filteredTournaments,
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
      end_date: { [Op.gte]: current_date, created_by: userId },
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
    });

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

    const joinedTournaments = await joinTournaments.findAll({
      where: { userId: userId },
    });

    if (joinedTournaments.length === 0) {
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
