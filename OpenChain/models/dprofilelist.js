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

const userlist = require("./userlist");

const dprofilelist = sequelize.define(
  "dprofilelist",
  {
    DonorID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    UID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: userlist,
        key: "UID",
      },
    },
    Name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    DProfileImage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    BIO: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "dprofilelist",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  }
);

module.exports = dprofilelist;
