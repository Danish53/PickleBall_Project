import { Sequelize } from "sequelize";
import { config } from 'dotenv';

config(); 

// Initialize Sequelize with environment variables
console.log(process.env.MYSQL_USER, 'nameeeeeee');
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    dialect: "mysql",
  }
);

// Function to authenticate and connect to the database
const dbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to database!!");
  } catch (err) {
    console.log(`Some error occurred while connecting to database: ${err.message}`);
  }
};

export { sequelize, dbConnection };
