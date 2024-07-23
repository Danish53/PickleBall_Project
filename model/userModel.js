import { DataTypes } from "sequelize";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sequelize } from "../database/dbConnection.js";

const validateLatitude = (value) => {
  if (
    !/^(\+|-)?(?:90(?:(?:\.0{1,15})?)|(?:[1-8]?\d(?:(?:\.\d{1,15})?)))$/.test(
      value
    )
  ) {
    throw new Error("Invalid latitude format!");
  }
};

const validateLongitude = (value) => {
  if (
    !/^(\+|-)?(?:180(?:(?:\.0{1,15})?)|(?:1[0-7]\d|[1-9]?\d)(?:(?:\.\d{1,15})?))$/.test(
      value
    )
  ) {
    throw new Error("Invalid longitude format!");
  }
};

const Users = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: {
          args: /^\+?[1-9]\d{1,14}$/,
          message: "Invalid phone number format!",
        },
      },
    },
    userType: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: {
          args: [["Coach", "individual", "admin"]],
          message: "User type must be either 'Coach' or 'individual'!",
        },
      },
    },
    courtName: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    latitude: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isLat(value) {
          validateLatitude(value);
        },
      },
    },
    longitude: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isLong(value) {
          validateLongitude(value);
        },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profileAvatar: {
      type: DataTypes.STRING,
    },
    banned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },

  {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.password && user.changed("password")) {
          if (user.userType !== "admin") {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        }
      },
    },
    timestamps: true,
  }
);

Users.prototype.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

Users.prototype.getJWTToken = function () {
  return jwt.sign(
    { id: this.id, email: this.email },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: process.env.EXPIRES_jWT,
    }
  );
};

export { Users };
