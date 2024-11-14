import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const Tournaments = sequelize.define(
  "tournaments",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tournament_name: {
      type: DataTypes.STRING,
    },
    tournament_type: {
      type: DataTypes.STRING,
      validate: {
        isIn: {
          args: [["leagues", "round robin"]],
          message: "tournaments types must be either 'leagues' , 'roundrobin'!",
        },
      },
    },
    start_date: {
      type: DataTypes.DATE,
    },
    end_date: {
      type: DataTypes.DATE,
    },
    court_name: {
      type: DataTypes.STRING,
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    max_players: {
      type: DataTypes.STRING,
    },
    min_rating: {
      type: DataTypes.STRING,
    },
    max_rating: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
  }
);

export { Tournaments };
