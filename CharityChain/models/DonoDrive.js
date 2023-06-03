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
    Urgent: {
      type: DataTypes.TINYINT,
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
