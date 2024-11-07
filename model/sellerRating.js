import { DataTypes } from "sequelize";
import { sequelize } from "../database/dbConnection.js";

const SellerRating = sequelize.define(
  "sellerRating",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
    },
    sellerId: {
      type: DataTypes.INTEGER,
      
    },
    rating: {
      type: DataTypes.STRING,
      validate: {
        min: 1.0,
        max: 5.0,
      },
    },
  },
  {
    timestamps: true,
  }
);

export { SellerRating };
