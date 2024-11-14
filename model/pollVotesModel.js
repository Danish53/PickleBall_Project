import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const PollVotes = sequelize.define(
  "pollVotes",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    pollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userPhoneNumber: {
      type: DataTypes.STRING,
    },
    selectedOptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

export { PollVotes };
