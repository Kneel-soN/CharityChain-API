const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
  }
);

// Define the Badgelist model
const Badgelist = sequelize.define(
  "badgelist",
  {
    BadgeID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    BadgeImage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    BadgeDesc: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    AccountID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "badgelist",
    timestamps: false,
  }
);
module.exports = Badgelist;
