import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const PrivateMessage = sequelize.define(
  "PrivateMessage",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    senderPhoneNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    receiverPhoneNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

export { PrivateMessage };
