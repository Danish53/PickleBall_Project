import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const chatGroups = sequelize.define(
  "chatGroups",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    courtId: {
      type: DataTypes.STRING,
      unique: true,
    },
    adminId: {
      type: DataTypes.STRING,
      unique: true,
    },
    groupName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    courtName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

export { chatGroups };
