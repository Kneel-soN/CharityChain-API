const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize("charitychain", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

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
