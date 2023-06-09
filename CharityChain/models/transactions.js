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

const transactions = sequelize.define(
  "transactions",
  {
    TransactID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    DriveID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Amount: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: false,
    },
    DateDonated: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "transactions",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  }
);

module.exports = transactions;
