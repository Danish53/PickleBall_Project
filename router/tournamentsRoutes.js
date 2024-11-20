import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { checkBannedUser } from "../middleware/bannedUser.js";
import {
  acceptOrRejectRequest,
  allPlayers,
  allTournaments,
  createTournament,
  getRequests,
  joinedTournamentsUsers,
  joinTournament,
  sendRequestToPlayers,
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
tournamentsroutes.get(
  "/all-players",
  isAuthenticated,
  checkBannedUser,
  allPlayers
);
tournamentsroutes.post(
  "/send-request/:userId/:tournamentId",
  isAuthenticated,
  checkBannedUser,
  sendRequestToPlayers
);
tournamentsroutes.get(
  "/all-requests/:userId",
  isAuthenticated,
  checkBannedUser,
  getRequests
);
tournamentsroutes.post(
  "/accept-request/:requestId",
  isAuthenticated,
  checkBannedUser,
  acceptOrRejectRequest
);

export default tournamentsroutes;
