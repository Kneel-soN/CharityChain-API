const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("charitychain", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

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
