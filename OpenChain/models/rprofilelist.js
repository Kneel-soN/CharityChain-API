const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("charitychain", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

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
