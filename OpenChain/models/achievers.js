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

const Achievers = sequelize.define(
  "achievers",
  {
    ID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    DonorID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    AchieveID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "achievers",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  }
);

module.exports = Achievers;
