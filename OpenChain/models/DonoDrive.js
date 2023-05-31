const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize("charitychain", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

const DonoDrive = sequelize.define(
  "donodrive",
  {
    DriveID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    AccountID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    DriveName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Intro: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Cause: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    DriveImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    Documents: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    Goal: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
    },
    Raised: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
    },
    DateTarget: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    Summary: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "donodrive",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  }
);

module.exports = DonoDrive;
