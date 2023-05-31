const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("charitychain", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

const Dono = sequelize.define(
  "donolist",
  {
    DonorID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    Name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    DonorImage: {
      type: DataTypes.BLOB,
      allowNull: false,
    },
    DonorMeta: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    BIO: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "donorlist",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  }
);

module.exports = Dono;
