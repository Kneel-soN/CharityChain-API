require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const DonoDrive = require("./models/DonoDrive");
const achievements = require("./models/achievements");
const achievers = require("./models/achievers");
const Badgelist = require("./models/badgelist");
const transactions = require("./models/transactions");
const userlist = require("./models/userlist");
const dprofilelist = require("./models/dprofilelist");
const rprofilelist = require("./models/rprofilelist");
const bcrypt = require("bcrypt");
const app = express();

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json());

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

app.get("/", (req, res) => {
  res.send("OpenChain API is now live and running ^-^!");
});
//login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userlist.findOne({ where: { email: email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Main token
    const accessToken = jwt.sign(
      { email: user.email, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    // Refresh token
    const refreshToken = jwt.sign(
      { email: user.email, role: user.Role },
      process.env.REFRESH_JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ Token: accessToken, Token1: refreshToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST
//User / Register User
app.post("/register", async (req, res) => {
  try {
    const { email, password, metaData, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userlist.create({
      email: email,
      password: hashedPassword,
      MetaData: metaData,
      Role: role,
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/profile/create/donor/:UID", async (req, res) => {
  try {
    const { UID } = req.params;
    const { name, profileImage, bio } = req.body;

    const user = await userlist.findOne({ where: { UID: UID } });
    if (!user || user.Role !== "Donor") {
      return res
        .status(400)
        .json({ message: "Invalid user role. Must be a donor." });
    }

    const newProfile = await dprofilelist.create({
      UID: UID,
      Name: name,
      DProfileImage: profileImage,
      BIO: bio,
    });

    res.status(201).json(newProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/profile/create/recipient/:UID", async (req, res) => {
  try {
    const { UID } = req.params;
    const { name, profileImage, bio, accountCert } = req.body;

    const user = await userlist.findOne({ where: { UID: UID } });
    if (!user || user.Role !== "Recipient") {
      return res
        .status(400)
        .json({ message: "Invalid user role. Must be a recipient." });
    }

    const newProfile = await rprofilelist.create({
      UID: UID,
      Name: name,
      RProfileImage: profileImage,
      AccountCert: accountCert,
      BIO: bio,
    });

    res.status(201).json(newProfile);
  } catch (error) {
    // Handle any errors
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/rprofile/get/:accountId", async (req, res) => {
  const accountId = req.params.accountId;

  try {
    const user = await rprofilelist.findOne({
      where: {
        AccountID: accountId,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error retrieving user:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/dprofile/get/:donorId", async (req, res) => {
  const donorId = req.params.donorId;

  try {
    const donor = await dprofilelist.findOne({ where: { DonorID: donorId } });
    if (!donor) {
      return res.status(404).json({ error: "Donor not found" });
    }

    res.json(donor);
  } catch (error) {
    console.error("Error retrieving donor:", error);
    res.status(500).json({ error: "An error occurred" });
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

app.get("/transact/drive/:driveId", async (req, res) => {
  const driveId = req.params.driveId;

  try {
    const driveTransactions = await transactions.findAll({
      where: {
        DriveID: driveId,
      },
    });

    res.json(driveTransactions);
  } catch (error) {
    console.error("Error retrieving transactions:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.listen(3000, () => {
  console.log("######################################");
  console.log("**OpenChain is running on port 3000**");
  console.log("================Version 0=============");
  console.log("######################################");
});
