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
    end_date: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: true,
  }
);

export { joinTournaments };
