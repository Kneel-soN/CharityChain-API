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

const rprofilelist = sequelize.define(
  "rprofilelist",
  {
    AccountID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    UID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    Name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    RProfileImage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    AccountCert: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    BIO: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "rprofilelist",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  }
);

module.exports = rprofilelist;
