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
    groupName: {
      type: DataTypes.STRING,
    },
    latitude: {
      type: DataTypes.STRING,
    },
    longitude: {
      type: DataTypes.STRING,
    },
    userPhoneNumber: {
      type: DataTypes.STRING,
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
    courtImage: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
  }
);

export { groupMembers };
