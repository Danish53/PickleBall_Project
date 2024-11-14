import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const Message = sequelize.define(
  "messages",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userProfileAvatar: {
      type: DataTypes.STRING,
    },
    userPhoneNumber: {
      type: DataTypes.STRING,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isPoll: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  }
);

export { Message };
