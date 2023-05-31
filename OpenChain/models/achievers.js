const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize("charitychain", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

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
