import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const Requests = sequelize.define(
  "requests",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    receiverId:{
      type: DataTypes.INTEGER,
    },
    tournamentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
    },
  },
  {
    timestamps: true,
  }
);

export { Requests };
