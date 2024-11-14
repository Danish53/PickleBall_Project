import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const PollOptions = sequelize.define(
  "pollOptions",
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
    option_text:{
      type: DataTypes.STRING,
    },
    votes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
  }
);

export { PollOptions };
