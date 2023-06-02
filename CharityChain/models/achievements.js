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

const achievements = sequelize.define(
  "achievements",
  {
    AchieveID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    AchieveName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    AchieveImage: {
      type: DataTypes.BLOB,
      allowNull: false,
    },
    AccountID: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "achievements",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  }
);

module.exports = achievements;
