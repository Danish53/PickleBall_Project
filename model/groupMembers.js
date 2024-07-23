import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const groupMembers = sequelize.define(
  "groupMembers",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userPhoneNumber: {
      type: DataTypes.INTEGER,
    },
    userName: {
      type: DataTypes.STRING,
    },
    userType: {
      type: DataTypes.STRING,
    },
    profileAvatar: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
  }
);

export { groupMembers };
