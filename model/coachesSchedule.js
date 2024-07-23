import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const Schedule = sequelize.define(
  "Schedule",
  {
    coachId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    days: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fromTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    toTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

export { Schedule };
