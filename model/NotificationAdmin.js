import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const Notifications = sequelize.define(
  "Notifications",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

export { Notifications };
