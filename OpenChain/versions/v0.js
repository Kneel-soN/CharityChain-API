require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const Recipient = require("./models/Recepient");
const CreateRecepient = require("./models/Recepient");
const Donor = require("./models/Dono");
const DonoDrive = require("./models/DonoDrive");
const achievements = require("./models/achievements");
const achievers = require("./models/achievers");
const Badgelist = require("./models/badgelist");
const transactions = require("./models/transactions");

const app = express();

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json());

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "charitychain",
});

app.get("/", (req, res) => {
  res.send("OpenChain API is now live and running ^-^!");
});
// POST RR1
//NGO / Recepient Register
app.post("/register/recepient", async (req, res) => {
  console.log("Received request to create user:", req.body); // Add this line to see the request body
  const { Name, AccountImage, AccountMeta, AccountCert, BIO } = req.body;

  try {
    const Recepient = await CreateRecepient.create({
      Name,
      AccountImage,
      AccountMeta,
      AccountCert,
      BIO,
    });
    const token = jwt.sign(
      { userId: Recepient.AccountID },
      process.env.JWT_SECRET
    );
    console.log("Created user:", Recipient);
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create user" });
  }
});
// POST RD1
app.post("/register/donor", async (req, res) => {
  console.log("Received request to create user:", req.body); // Add this line to see the request body
  const { Name, DonorImage, DonorMeta, BIO } = req.body;

  try {
    const Dono = await Donor.create({
      Name,
      DonorImage,
      DonorMeta,
      BIO,
    });
    const token = jwt.sign({ userId: Donor.DonorID }, process.env.JWT_SECRET);
    console.log("Created user:", Donor);
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create user" });
  }
});
// POST DC1
app.post("/donodrive/create", async (req, res) => {
  try {
    const {
      AccountID,
      DriveName,
      Intro,
      Cause,
      DriveImage,
      Documents,
      Goal,
      Raised,
      DateTarget,
      Summary,
    } = req.body;
    const donoDrive = await DonoDrive.create({
      AccountID,
      DriveName,
      Intro,
      Cause,
      DriveImage,
      Documents,
      Goal,
      Raised,
      DateTarget,
      Summary,
    });
    res.status(201).json(donoDrive);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create donodrive entry" });
  }
});
// GET DD/ALL
app.get("/donodrive/get/all", async (req, res) => {
  try {
    const donoDrives = await DonoDrive.findAll();
    res.json(donoDrives);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to retrieve donodrive entries" });
  }
});
// POST AC1
app.post("/achievements/create", async (req, res) => {
  try {
    const { AchieveName, Description, AchieveImage, AccountID } = req.body;

    const newAchievement = await achievements.create({
      AchieveName,
      Description,
      AchieveImage,
      AccountID,
    });

    res.status(201).json(newAchievement);
  } catch (error) {
    console.error("Error creating achievement:", error);
    res.status(500).json({ error: "Failed to create achievement" });
  }
});
// POST AA1
app.post("/achievements/award", async (req, res) => {
  try {
    const { DonorID, AchieveID } = req.body;

    const newAchiever = await achievers.create({
      DonorID,
      AchieveID,
    });

    res.status(201).json(newAchiever);
  } catch (error) {
    console.error("Error creating achiever:", error);
    res.status(500).json({ error: "Failed to create achiever" });
  }
});

//POST BC1
app.post("/badges/create", async (req, res) => {
  const { BadgeImage, BadgeDesc, AccountID } = req.body;
  try {
    const newBadge = await Badgelist.create({
      BadgeImage,
      BadgeDesc,
      AccountID,
    });
    res.json(newBadge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// POST TD1
app.post("/transact/donate", async (req, res) => {
  const { DonorID, DriveID, Amount } = req.body;

  try {
    const drive = await DonoDrive.findOne({ where: { DriveID } });
    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Create the donation transaction
    const donation = await transactions.create({
      DonorID,
      DriveID,
      Amount,
    });
    const updatedDrive = await DonoDrive.increment("raised", {
      by: Amount,
      where: { DriveID },
    });

    res.json(donation);
  } catch (error) {
    console.error("Error creating donation:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.listen(3000, () => {
  console.log("######################################");
  console.log("**OpenChain is running on port 3000**");
  console.log("================Version 0=============");
  console.log("######################################");
});
