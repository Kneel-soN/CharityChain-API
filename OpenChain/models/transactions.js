const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize("charitychain", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

const transactions = sequelize.define(
  "transactions",
  {
    TransactID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    DonorID: {
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
