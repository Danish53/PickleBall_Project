import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const coachServices = sequelize.define(
  "coachServices",
  {
    coachId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

export { coachServices };
