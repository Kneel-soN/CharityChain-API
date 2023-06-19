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
const bcrypt = require("bcrypt");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const moment = require("moment");

const { Op } = require("sequelize");

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

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

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "image") {
        cb(null, "public/images");
      } else if (file.fieldname === "pdf") {
        cb(null, "public/files");
      } else {
        cb(new Error("Invalid fieldname"), null);
      }
    },
    filename: (req, file, cb) => {
      const originalName = file.originalname.toLowerCase().split(" ").join("-");
      const uniqueSuffix = moment().format("YYYYMMDDHHmmssSSS");
      const fileName = `${uniqueSuffix}-${originalName}`;

      cb(null, fileName);
    },
  }),
});

app.post(
  "/upload",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  (req, res) => {
    const imageFiles = req.files["image"];
    const pdfFiles = req.files["pdf"];

    if (!imageFiles || !pdfFiles) {
      return res
        .status(400)
        .json({ error: "Both image and PDF files are required" });
    }

    // Handle the image and PDF file uploads

    const imageUrl = "/images/photos/" + imageFiles[0].filename;
    const pdfUrl = "/files/" + pdfFiles[0].filename;

    res.json({ imageUrl, pdfUrl });
  }
);
//user login
app.post("/login", async (req, res) => {
  try {
    const { metadata } = req.body;

    const user = await userlist.findOne({ where: { MetaData: metadata } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Main token
    const accessToken = jwt.sign(
      {
        UID: user.UID,
        email: user.email,
        role: user.Role,
        MetaData: user.MetaData,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    // Refresh token
    const refreshToken = jwt.sign(
      {
        UID: user.UID,
        email: user.email,
        role: user.Role,
        MetaData: user.MetaData,
      },
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

    // Check if the metadata is already registered
    const existingUser = await userlist.findOne({
      where: { MetaData: metaData },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Metamask already registered" });
    }

    const newUser = await userlist.create({
      email: email,
      password: hashedPassword,
      MetaData: metaData,
      Role: role,
    });

    // Exclude the hashed password from the response
    const { password: _, ...uwpw } = newUser.toJSON();

    res.status(201).json(uwpw);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Continue user creation
app.post("/profile/create/user/:UID", async (req, res) => {
  try {
    const { UID } = req.params;
    const { name, profileImage, bio, accountCert } = req.body;

    const newProfile = await userlist.create({
      UID: UID,
      Name: name,
      ProfileImage: profileImage,
      AccountCert: accountCert,
      BIO: bio,
    });

    res.status(201).json(newProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get profile of a recipient in the current session
app.get("/ownprofile/get/", authToken, async (req, res) => {
  try {
    const user = await userlist.findOne({
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

// get donor profile in search
app.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const donorUser = await userlist.findOne({
      where: {
        UID: userId,
      },
      attributes: {
        exclude: ["UID", "password"],
      },
    });

    if (!donorUser) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(donorUser);
  } catch (error) {
    console.error("Error retrieving donor profile:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.put("/profile/edit/name", authToken, async (req, res) => {
  try {
    const { name } = req.body;
    const uid = req.user.id;

    const user = await userlist.findOne({
      where: { UID: uid },
    });

    if (user) {
      await userlist.update({ Name: name }, { where: { UID: uid } });

      const updatedUser = await userlist.findOne({ where: { UID: uid } });

      return res.status(200).json(updatedUser);
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.put("/profile/edit/bio", authToken, async (req, res) => {
  try {
    const { BIO } = req.body;
    const uid = req.user.id;

    const user = await userlist.findOne({
      where: { UID: uid },
    });

    if (!user) {
      return res.sendStatus(404);
    }

    await userlist.update({ BIO: BIO }, { where: { UID: uid } });

    const updatedUser = await userlist.findOne({ where: { UID: uid } });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.put("/profile/edit/image", authToken, async (req, res) => {
  try {
    const { name, profileimage } = req.body;
    const uid = req.user.id;

    const user = await userlist.findOne({
      where: { UID: uid },
    });

    if (!user) {
      return res.sendStatus(404);
    }

    await userlist.update(
      { Name: name, ProfileImage: profileimage },
      { where: { UID: uid } }
    );

    const updatedUser = await userlist.findOne({ where: { UID: uid } });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.put("/profile/edit/cert", authToken, async (req, res) => {
  try {
    const { accountcert } = req.body;
    const uid = req.user.id;

    const user = await userlist.findOne({
      where: { UID: uid },
    });

    if (!user) {
      return res.sendStatus(404);
    }

    await userlist.update(
      { AccountCert: accountcert },
      { where: { UID: uid } }
    );

    const updatedUser = await userlist.findOne({ where: { UID: uid } });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

// START OF DONODRIVE ENDPOINTS
// POST Create Dono Drive
app.post("/donodrive/create", authToken, async (req, res) => {
  try {
    const {
      DriveID,
      DriveName,
      Intro,
      Cause,
      DriveImage,
      Documents,
      Goal,
      Raised,
      DateTarget,
      Summary,
      Urgent,
    } = req.body;

    const UID = req.user.id;

    const existingUser = await userlist.findOne({
      where: { UID },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const donoDrive = await DonoDrive.create({
      DriveID,
      DriveName,
      Intro,
      Cause,
      DriveImage,
      Documents,
      Goal,
      Raised,
      DateTarget,
      Summary,
      Urgent,
    });

    const metadata = existingUser.MetaData;

    const donoDriveWithMetadata = {
      ...donoDrive.toJSON(),
      metadata: metadata ? metadata : null,
    };

    res.status(201).json(donoDriveWithMetadata);
  } catch (error) {
    console.error("Error creating donodrive entry:", error);
    res.status(500).json({ error: "Failed to create donodrive entry" });
  }
});

//Start of DonoDrive Endpoints

// GET ALL DonoDrive
app.get("/donodrive/get/all", async (req, res) => {
  try {
    const donoDrives = await DonoDrive.findAll({});

    const creatorIds = donoDrives.map((drive) => drive.UID);
    const metadataList = await userlist.findAll({
      where: { UID: creatorIds },
    });

    const DrivesWithNamesAndToGo = donoDrives.map((drive) => {
      const metadata = metadataList.find((user) => user.UID === drive.UID);

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
        UID: drive.UID,
        DriveName: drive.DriveName,
        Intro: drive.Intro,
        Cause: drive.Cause,
        DriveImage: drive.DriveImage,
        Documents: drive.Documents,
        Summary: drive.Summary,
        DateTarget: drive.DateTarget,
        metadata: metadata ? metadata.MetaData : null,
        Urgent: drive.Urgent,
        infolist,
      };
    });

    res.json(DrivesWithNamesAndToGo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to retrieve donodrive entries" });
  }
});

// Get TOP 2 Urgent DonoDrive
app.get("/donodrive/get/urgent", async (req, res) => {
  try {
    const donoDrives = await DonoDrive.findAll({
      where: {
        Urgent: 1,
      },
      order: [["DateTarget", "ASC"]],
      limit: 2,
    });

    const creatorIds = donoDrives.map((drive) => drive.UID); // Update to use UID
    const recipientNames = await userlist.findAll({
      where: { UID: creatorIds }, // Update to use UID
    });

    const metadataPromises = recipientNames.map((recipient) => {
      return userlist.findOne({
        where: { UID: recipient.UID },
      });
    });

    const metadataResults = await Promise.all(metadataPromises);

    const DriveswInfo = donoDrives.map((drive) => {
      const recipientName = recipientNames.find(
        (creator) => creator.UID === drive.UID // Update to use UID
      );

      const metadata = metadataResults.find(
        (metadata) => metadata.UID === recipientName.UID
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
        DateTarget: drive.DateTarget,
        Urgent: drive.Urgent,
        DriveID: drive.DriveID,
        UID: drive.UID,
        DriveName: drive.DriveName,
        Intro: drive.Intro,
        Cause: drive.Cause,
        DriveImage: drive.DriveImage,
        Documents: drive.Documents,
        Summary: drive.Summary,
        name: recipientName ? recipientName.Name : null,
        metadata: metadata ? metadata.MetaData : null,
        infolist,
      };
    });

    res.json(DriveswInfo);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to retrieve urgent donodrive entries" });
  }
});

// Urgent Except the Input
app.get("/donodrive/get/urgent-exclude", async (req, res) => {
  const { excludeID } = req.body;

  try {
    const donoDrives = await DonoDrive.findAll({
      where: {
        DriveID: {
          [Op.ne]: excludeID,
        },
        Urgent: 1,
      },
      order: [["DriveID", "ASC"]],
    });

    const creatorIds = donoDrives.map((drive) => drive.UID);
    const recipientNames = await userlist.findAll({
      where: { UID: creatorIds },
    });

    const userIds = recipientNames.map((recipient) => recipient.UID);
    const metadataList = await userlist.findAll({
      where: { UID: userIds },
    });

    const dinfo = donoDrives.map((drive) => {
      const recipientName = recipientNames.find(
        (creator) => creator.UID === drive.UID
      );

      const metadata = metadataList.find(
        (user) => user.UID === recipientName?.UID
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
        DateTarget: drive.DateTarget,
        Urgent: drive.Urgent,
        DriveID: drive.DriveID,
        UID: drive.UID,
        DriveName: drive.DriveName,
        Intro: drive.Intro,
        Cause: drive.Cause,
        DriveImage: drive.DriveImage,
        Documents: drive.Documents,
        Summary: drive.Summary,
        name: recipientName ? recipientName.Name : null,
        metadata: metadata ? metadata.MetaData : null,
        infolist,
      };
    });

    res.json(dinfo);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to retrieve urgent donodrive entries" });
  }
});

// DonoDrives of Specific Account/Recipient
app.get("/donodrive/specific/:UID", async (req, res) => {
  try {
    const UID = req.params.UID;

    const drives = await DonoDrive.findAll({
      where: { UID: UID },
    });

    if (!drives || drives.length === 0) {
      return res.status(404).json({ error: "DonoDrive records not found" });
    }

    const creatorIds = drives.map((drive) => drive.UID);
    const recipientNames = await userlist.findAll({
      where: { UID: creatorIds },
    });

    const userIds = recipientNames.map((recipient) => recipient.UID);
    const metadataList = await userlist.findAll({
      where: { UID: userIds },
    });

    const dinfo = await Promise.all(
      drives.map(async (drive) => {
        const goal = drive.Goal;
        const raised = drive.Raised;
        const toGo = goal - raised;

        const recipientName = recipientNames.find(
          (creator) => creator.UID === drive.UID
        );

        const metadata = metadataList.find(
          (user) => user.UID === recipientName?.UID
        );

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

        const dinfo = {
          UID: drive.UID,
          DriveID: drive.DriveID,
          DriveName: drive.DriveName,
          Intro: drive.Intro,
          Cause: drive.Cause,
          DriveImage: drive.DriveImage,
          Documents: drive.Documents,
          Summary: drive.Summary,
          name: recipientName ? recipientName.Name : null,
          metadata: metadata ? metadata.MetaData : null,
          DateTarget: drive.DateTarget,
          Urgent: drive.Urgent,
          infolist,
        };

        return dinfo;
      })
    );

    return res.json(dinfo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

//specific Donodrive
app.get("/donodrive/get/drive/:DriveID", async (req, res) => {
  try {
    const DriveID = req.params.DriveID;

    const drive = await DonoDrive.findOne({
      where: { DriveID: DriveID },
    });

    if (!drive) {
      return res.status(404).json({ error: "DonoDrive record not found" });
    }

    const goal = drive.Goal;
    const raised = drive.Raised;
    const toGo = goal - raised;

    const recipientName = await userlist.findOne({
      where: { UID: drive.UID },
    });

    const metadata = await userlist.findOne({
      where: { UID: recipientName?.UID },
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

    const dinfo = {
      DriveID: drive.DriveID,
      UID: drive.UID,
      DriveName: drive.DriveName,
      Intro: drive.Intro,
      Cause: drive.Cause,
      DriveImage: drive.DriveImage,
      Documents: drive.Documents,
      Summary: drive.Summary,
      name: recipientName ? recipientName.Name : null,
      metadata: metadata ? metadata.MetaData : null,
      DateTarget: drive.DateTarget,
      Urgent: drive.Urgent,
      infolist,
    };

    return res.json(dinfo);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/donodrive/rename/:DriveID", authToken, async (req, res) => {
  const { DriveID } = req.params;
  const { driveName } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await userlist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    // Find the specific drive by DriveID
    const drive = await DonoDrive.findByPk(DriveID);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Check if UID matches
    if (drive.UID !== UID) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    drive.DriveName = driveName;
    await drive.save();

    res.json(drive);
  } catch (error) {
    console.error("Error updating drive:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/donodrive/intro/DriveID", authToken, async (req, res) => {
  const { DriveID } = req.params;
  const { intro } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await userlist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    // Find the specific drive by DriveID
    const drive = await DonoDrive.findByPk(DriveID);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Check if UID matches
    if (drive.UID !== UID) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    drive.Intro = intro;
    await drive.save();

    res.json(drive);
  } catch (error) {
    console.error("Error updating drive:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/donodrive/cause/:DriveID", authToken, async (req, res) => {
  const { DriveID } = req.params;
  const { cause } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await userlist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    const drive = await DonoDrive.findByPk(DriveID);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    if (drive.UID !== UID) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    drive.Cause = cause;
    await drive.save();

    res.json(drive);
  } catch (error) {
    console.error("Error updating drive:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/donodrive/documents", authToken, async (req, res) => {
  const { DriveID } = req.params;
  const { documents } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await userlist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    // Find the specific drive by DriveID
    const drive = await DonoDrive.findByPk(DriveID);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Check if UID matches
    if (drive.UID !== UID) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    drive.Documents = documents;
    await drive.save();

    res.json(drive);
  } catch (error) {
    console.error("Error updating drive:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/donodrive/summary/:DriveID", authToken, async (req, res) => {
  const { DriveID } = req.params;
  const { summary } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await userlist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    const drive = await DonoDrive.findByPk(DriveID);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    if (drive.UID !== UID) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    drive.Summary = summary;
    await drive.save();

    res.json(drive);
  } catch (error) {
    console.error("Error updating drive:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//END OF DONODRIVE ENDPOINTS

// POST Create Achievement by Recipient
app.post("/achievements/create", authToken, async (req, res) => {
  try {
    const { AchieveName, Description, AchieveImage } = req.body;
    const UID = req.user.id;

    const existingAccount = await userlist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Check if recipient exists in the userlist table
    const existingRecipient = await userlist.findByPk(UID);

    if (!existingRecipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const newAchievement = await achievements.create({
      AchieveName,
      Description,
      AchieveImage,
      UID,
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
    const { AchieveID } = req.body;
    const UID = req.user.id;

    const existingAccount = await userlist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Account not found" });
    }

    const newAchiever = await achievers.create({
      UID,
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
    const existingAccount = await userlist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Account not found" });
    }

    const newBadge = await Badgelist.create({
      BadgeImage,
      BadgeDesc,
      UID,
    });

    res.json(newBadge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST TD1
app.post("/transact/donate/:DriveID", authToken, async (req, res) => {
  const { Amount, DateDonated } = req.body;
  const DriveID = req.params.DriveID;
  const UID = req.user.id;

  try {
    const drive = await DonoDrive.findOne({ where: { DriveID } });
    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    const existingAccount = await userlist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Account not found" });
    }

    const donation = await transactions.create({
      UID: UID,
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

// Transactions of specific drive
app.get("/transact/drive/:DriveID", async (req, res) => {
  const DriveID = req.params.DriveID;

  try {
    const drive = await DonoDrive.findByPk(DriveID);
    if (!drive) {
      return res.status(404).json({ error: "Drive does not exist" });
    }

    const driveTransactions = await transactions.findAll({
      where: {
        DriveID: DriveID,
      },
    });

    const donorIds = driveTransactions.map((transaction) => transaction.UID);
    const donorNames = await userlist.findAll({
      where: { UID: donorIds },
    });

    const driveIds = driveTransactions.map(
      (transaction) => transaction.DriveID
    );
    const driveNames = await DonoDrive.findAll({
      where: { DriveID: driveIds },
    });

    const twinfo = driveTransactions.map((transaction) => {
      const donorName = donorNames.find(
        (donor) => donor.UID === transaction.UID
      );
      const driveName = driveNames.find(
        (drive) => drive.DriveID === transaction.DriveID
      );

      return {
        TransactionID: transaction.TransactID,
        DriveID: transaction.DriveID,
        UID: transaction.UID,
        Amount: transaction.Amount,
        DateDonated: transaction.DateDonated,
        From: donorName ? donorName.Name : null,
        To: driveName ? driveName.DriveName : null,
      };
    });

    res.json(twinfo);
  } catch (error) {
    console.error("Error retrieving transactions:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/transact/ofdonor/:UID", async (req, res) => {
  const UID = req.params.UID;

  try {
    const driveTransactions = await transactions.findAll({
      where: {
        UID: UID,
      },
    });

    const donorName = await userlist.findOne({
      where: { UID: UID },
    });

    const driveIds = driveTransactions.map(
      (transaction) => transaction.DriveID
    );
    const driveNames = await DonoDrive.findAll({
      where: { DriveID: driveIds },
    });

    const twinfo = driveTransactions.map((transaction) => {
      const driveName = driveNames.find(
        (drive) => drive.DriveID === transaction.DriveID
      );

      return {
        TransactionID: transaction.TransactionID,
        DriveID: transaction.DriveID,
        UID: transaction.UID,
        Amount: transaction.Amount,
        DateDonated: transaction.DateDonated,
        DonorName: donorName ? donorName.Name : null,
        DriveName: driveName ? driveName.DriveName : null,
      };
    });

    res.json(twinfo);
  } catch (error) {
    console.error("Error retrieving transactions:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/transact/all", async (req, res) => {
  try {
    const driveTransactions = await transactions.findAll();

    const donorIds = driveTransactions.map((transaction) => transaction.UID);
    const donorNames = await userlist.findAll({
      where: { UID: donorIds },
    });

    const driveIds = driveTransactions.map(
      (transaction) => transaction.DriveID
    );
    const driveNames = await DonoDrive.findAll({
      where: { DriveID: driveIds },
    });

    const twinfo = driveTransactions.map((transaction) => {
      const donorName = donorNames.find(
        (donor) => donor.UID === transaction.UID
      );
      const driveName = driveNames.find(
        (drive) => drive.DriveID === transaction.DriveID
      );

      return {
        TransactionID: transaction.TransactionID,
        DriveID: transaction.DriveID,
        UID: transaction.UID,
        Amount: transaction.Amount,
        DateDonated: transaction.DateDonated,
        From: donorName ? donorName.Name : null,
        To: driveName ? driveName.DriveName : null,
      };
    });

    res.json(twinfo);
  } catch (error) {
    console.error("Error retrieving transactions:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.listen(3001, () => {
  console.log("##########################################");
  console.log(
    "\x1b[37m*\x1b[32mCharity\x1b[36mChain \x1b[37mAPI is running on port 3001*"
  );
  console.log("=================\x1b[33mVersion 3\x1b[37m================");
  console.log("\x1b[37m##########################################");
});
