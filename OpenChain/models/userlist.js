const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize("charitychain", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

const userlist = sequelize.define(
  "userlist",
  {
    UID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    MetaData: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "userlist",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  }
);
module.exports = userlist;
