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
  res.send("CharityChain API is now live and running ^-^!");
});
//user login
app.post("/login", async (req, res) => {
  try {
    const { UID, email, password } = req.body;

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
      { UID: user.UID, email: user.email, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    // Refresh token
    const refreshToken = jwt.sign(
      { UID: user.UID, email: user.email, role: user.Role },
      process.env.REFRESH_JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ Token: accessToken, RefreshToken: refreshToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
async function authToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  console.log("Auth KEY: ", authHeader);
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
    if (err) {
      console.error(err);
      return res.sendStatus(403);
    }
    try {
      req.user = {
        id: decodedToken.UID,
      };
      next();
    } catch (error) {
      console.error(error);
      return res.sendStatus(500);
    }
  });
}

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
// Continue donor creation
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
// Continue recipient creation
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
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// Get profile of a recipient
app.get("/rprofile/get/", authToken, async (req, res) => {
  try {
    const user = await rprofilelist.findOne({
      where: {
        UID: req.user.id,
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

// get profile of a donor
app.get("/dprofile/get/", authToken, async (req, res) => {
  try {
    const user = await dprofilelist.findOne({
      where: {
        UID: req.user.id, // Use the decoded user ID from the JWT token
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

// POST Create Dono Drive
app.post("/donodrive/create", authToken, async (req, res) => {
  try {
    const {
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

    const UID = req.user.id;

    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Account not found" });
    }

    const AccountID = existingAccount.AccountID;

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
    console.error("Error creating donodrive entry:", error);
    res.status(500).json({ error: "Failed to create donodrive entry" });
  }
});

// GET ALL DonoDrive

app.get("/donodrive/get/all", async (req, res) => {
  try {
    const donoDrives = await DonoDrive.findAll({});

    const creatorIds = donoDrives.map((drive) => drive.AccountID);
    const recipientNames = await rprofilelist.findAll({
      where: { AccountID: creatorIds },
    });

    const DrivesWithNamesAndToGo = donoDrives.map((drive) => {
      const recipientName = recipientNames.find(
        (creator) => creator.AccountID === drive.AccountID
      );

      const goal = drive.Goal;
      const raised = drive.Raised;
      const toGo = goal - raised;

      const infolist = [
        {
          infoTitle: "Goal",
          amount: goal,
        },
        {
          infoTitle: "Raised",
          amount: raised,
        },
        {
          infoTitle: "To Go",
          amount: toGo,
        },
      ];

      return {
        DriveID: drive.DriveID,
        AccountID: drive.AccountID,
        DriveName: drive.DriveName,
        Intro: drive.Intro,
        Cause: drive.Cause,
        DriveImage: drive.DriveImage,
        Documents: drive.Documents,
        Summary: drive.Summary,
        name: recipientName ? recipientName.Name : null,
        infolist,
      };
    });

    res.json(DrivesWithNamesAndToGo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to retrieve donodrive entries" });
  }
});

// DonoDrives of Specific Account
app.get("/donodrive/specific/:accountID", async (req, res) => {
  try {
    const accountID = req.params.accountID;

    const donoDriveRecords = await DonoDrive.findAll({
      where: { AccountID: accountID },
    });

    if (!donoDriveRecords || donoDriveRecords.length === 0) {
      return res.status(404).json({ error: "DonoDrive records not found" });
    }

    const donoDrivesWithInfo = await Promise.all(
      donoDriveRecords.map(async (donoDriveRecord) => {
        const goal = donoDriveRecord.Goal;
        const raised = donoDriveRecord.Raised;
        const toGo = goal - raised;

        const recipientName = await rprofilelist.findOne({
          where: { AccountID: donoDriveRecord.AccountID },
        });

        const infolist = [
          {
            infoTitle: "Goal",
            amount: goal,
          },
          {
            infoTitle: "Raised",
            amount: raised,
          },
          {
            infoTitle: "To Go",
            amount: toGo,
          },
        ];

        const donoDriveWithInfo = {
          DriveID: donoDriveRecord.DriveID,
          AccountID: donoDriveRecord.AccountID,
          DriveName: donoDriveRecord.DriveName,
          Intro: donoDriveRecord.Intro,
          Cause: donoDriveRecord.Cause,
          DriveImage: donoDriveRecord.DriveImage,
          Documents: donoDriveRecord.Documents,
          Summary: donoDriveRecord.Summary,
          name: recipientName ? recipientName.Name : null,
          infolist,
        };

        return donoDriveWithInfo;
      })
    );

    return res.json(donoDrivesWithInfo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/donodrive/:DriveID", async (req, res) => {
  try {
    const DriveID = req.params.DriveID;

    const donoDriveRecord = await DonoDrive.findOne({
      where: { DriveID: DriveID },
    });

    if (!donoDriveRecord) {
      return res.status(404).json({ error: "DonoDrive record not found" });
    }

    const goal = donoDriveRecord.Goal;
    const raised = donoDriveRecord.Raised;
    const toGo = goal - raised;

    const recipientName = await rprofilelist.findOne({
      where: { AccountID: donoDriveRecord.AccountID },
    });

    const infolist = [
      {
        infoTitle: "Goal",
        amount: goal,
      },
      {
        infoTitle: "Raised",
        amount: raised,
      },
      {
        infoTitle: "To Go",
        amount: toGo,
      },
    ];

    const donoDriveWithInfo = {
      DriveID: donoDriveRecord.DriveID,
      AccountID: donoDriveRecord.AccountID,
      DriveName: donoDriveRecord.DriveName,
      Intro: donoDriveRecord.Intro,
      Cause: donoDriveRecord.Cause,
      DriveImage: donoDriveRecord.DriveImage,
      Documents: donoDriveRecord.Documents,
      Summary: donoDriveRecord.Summary,
      RecipientName: recipientName ? recipientName.Name : null,
      infolist,
    };

    return res.json(donoDriveWithInfo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

//COMPARE UP AND DOWN ENDPOINT
// POST Create Achievement by Recipient
app.post("/achievements/create", authToken, async (req, res) => {
  try {
    const { AchieveName, Description, AchieveImage } = req.body;
    const UID = req.user.id;

    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Account not found" });
    }

    const AccountID = existingAccount.AccountID;

    // Check if the AccountID exists in the recipientlist table
    const existingRecipient = await rprofilelist.findByPk(AccountID);

    if (!existingRecipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

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
app.post("/achievements/award", authToken, async (req, res) => {
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
app.post("/badges/create", authToken, async (req, res) => {
  const { BadgeImage, BadgeDesc } = req.body;
  const UID = req.user.id;

  try {
    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Account not found" });
    }

    const AccountID = existingAccount.AccountID;

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
app.post("/transact/donate/:driveID", authToken, async (req, res) => {
  const { Amount, DateDonated } = req.body;
  const DriveID = req.params.driveID;
  const DonorID = req.user.id; // Retrieve DonorID from the decoded auth token

  try {
    const drive = await DonoDrive.findOne({ where: { DriveID } });
    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    const donation = await transactions.create({
      DonorID,
      DriveID,
      Amount,
      DateDonated,
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

app.get("/transact/ofdonor/:donorId", async (req, res) => {
  const donorId = req.params.donorId;

  try {
    const driveTransactions = await transactions.findAll({
      where: {
        DonorID: donorId,
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
  console.log("*CharityChain is running on port 3000*");
  console.log("================Version 2=============");
  console.log("######################################");
});
