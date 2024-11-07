import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const PrivateMessage = sequelize.define(
  "privateMessage",
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
      type: DataTypes.STRING,
      allowNull: false,
    },
    receiverPhoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    messageStatus: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    timestamps: true,
  }
);

export { PrivateMessage };
