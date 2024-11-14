import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { checkBannedUser } from "../middleware/bannedUser.js";
import {
  allTournaments,
  createTournament,
  joinedTournamentsUsers,
  joinTournament,
  singleUserTournaments,
} from "../controller/tournamentsController.js";

const tournamentsroutes = express.Router();

// tournamentsroutes
tournamentsroutes.post(
  "/create-tournament",
  isAuthenticated,
  checkBannedUser,
  createTournament
);
tournamentsroutes.get(
  "/all-tournaments",
  isAuthenticated,
  checkBannedUser,
  allTournaments
);
tournamentsroutes.get(
  "/signle-user-tournaments/:userId",
  isAuthenticated,
  checkBannedUser,
  singleUserTournaments
);
tournamentsroutes.get(
  "/join-tournament/:tournamentId",
  isAuthenticated,
  checkBannedUser,
  joinTournament
);
tournamentsroutes.get(
  "/joined-tournaments/:userId",
  isAuthenticated,
  checkBannedUser,
  joinedTournamentsUsers
);

export default tournamentsroutes;
