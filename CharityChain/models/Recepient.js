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

const CreateRecipient = sequelize.define(
  "recipientlist",
  {
    AccountID: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    Name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    AccountImage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    AccountMeta: {
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
    tableName: "recipientlist",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
  }
);

const DonoDrive = sequelize.define("donodrive", {
  AccountID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
  },
  // Other columns in the donodrive table
});

CreateRecipient.belongsTo(DonoDrive, {
  foreignKey: "AccountID",
  targetKey: "AccountID",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

module.exports = CreateRecipient;
