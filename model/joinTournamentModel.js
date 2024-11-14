import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const joinTournaments = sequelize.define(
  "joinTournaments",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tournamentId: {
      type: DataTypes.INTEGER,
    },
    userId: {
      type: DataTypes.INTEGER,
    },
    tournament_name: {
      type: DataTypes.STRING,
    },
    tournament_type: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
  }
);

export { joinTournaments };
