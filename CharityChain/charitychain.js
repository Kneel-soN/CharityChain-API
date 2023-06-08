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
const cors = require("cors");
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

    const existingProfile = await dprofilelist.findOne({ where: { UID: UID } });
    if (existingProfile) {
      return res.status(400).json({ message: "Profile already registered." });
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

    const existingProfile = await rprofilelist.findOne({ where: { UID: UID } });
    if (existingProfile) {
      return res.status(400).json({ message: "Profile already registered." });
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

// Get profile of a recipient in the current session
app.get("/ownrprofile/get/", authToken, async (req, res) => {
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

// get profile of a donor in the current session
app.get("/owndprofile/get/", authToken, async (req, res) => {
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

app.get("/dprofile/:userId", async (req, res) => {
  try {
    const { userId } = req.params; // Get the userId from the request parameters

    const donorUser = await dprofilelist.findOne({
      where: {
        DonorID: userId, // Use the userId as the DonorID
      },
      attributes: {
        exclude: ["UID"], // Exclude the UID field from the response
      },
    });

    if (!donorUser) {
      return res.status(404).json({ error: "Donor profile not found" });
    }

    res.json(donorUser);
  } catch (error) {
    console.error("Error retrieving donor profile:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.get("/rprofile/:userId", async (req, res) => {
  try {
    const { userId } = req.params; // Get the userId from the request parameters

    const recipientUser = await rprofilelist.findOne({
      where: {
        AccountID: userId,
      },
      attributes: {
        exclude: ["UID"], // Exclude the UID field from the response
      },
    });

    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient profile not found" });
    }

    res.json(recipientUser);
  } catch (error) {
    console.error("Error retrieving recipient profile:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.put("/profile/edit/name", authToken, async (req, res) => {
  try {
    const { name } = req.body;
    const uid = req.user.id;

    const donor = await dprofilelist.findOne({
      where: { UID: uid },
    });

    if (donor) {
      await dprofilelist.update(
        { Name: name },
        { where: { DonorID: donor.DonorID } }
      );

      const updatedDonor = await dprofilelist.findOne({
        where: { DonorID: donor.DonorID },
      });

      return res.status(200).json(updatedDonor);
    }

    const account = await rprofilelist.findOne({
      where: { UID: uid },
    });

    if (account) {
      await rprofilelist.update(
        { Name: name },
        { where: { AccountID: account.AccountID } }
      );

      const updatedAccount = await rprofilelist.findOne({
        where: { AccountID: account.AccountID },
      });

      return res.status(200).json(updatedAccount);
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.put("/profile/edit/bio", authToken, async (req, res) => {
  try {
    const { bio } = req.body;
    const uid = req.user.id;

    const donor = await dprofilelist.findOne({
      where: { UID: uid },
    });

    if (donor) {
      return res.status(403).json({ message: "You are not a recipient" });
    }

    const account = await rprofilelist.findOne({
      where: { UID: uid },
    });

    if (account) {
      await rprofilelist.update(
        { BIO: bio },
        { where: { AccountID: account.AccountID } }
      );

      const updatedAccount = await rprofilelist.findOne({
        where: { AccountID: account.AccountID },
      });

      return res.status(200).json(updatedAccount);
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.put("/profile/edit/image", authToken, async (req, res) => {
  try {
    const { name, profileimage } = req.body;
    const uid = req.user.id;

    const donor = await dprofilelist.findOne({
      where: { UID: uid },
    });

    if (donor) {
      await dprofilelist.update(
        { Name: name, DProfileImage: profileimage },
        { where: { DonorID: donor.DonorID } }
      );

      const updatedDonor = await dprofilelist.findOne({
        where: { DonorID: donor.DonorID },
      });

      return res.status(200).json(updatedDonor);
    }

    const account = await rprofilelist.findOne({
      where: { UID: uid },
    });

    if (account) {
      await rprofilelist.update(
        { Name: name, RProfileImage: profileimage },
        { where: { AccountID: account.AccountID } }
      );

      const updatedAccount = await rprofilelist.findOne({
        where: { AccountID: account.AccountID },
      });

      return res.status(200).json(updatedAccount);
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.put("/profile/edit/cert", authToken, async (req, res) => {
  try {
    const { accountcert } = req.body;
    const uid = req.user.id;

    const donor = await dprofilelist.findOne({
      where: { UID: uid },
    });

    if (donor) {
      return res.status(400).json({ message: "You are not a recipient" });
    }

    const account = await rprofilelist.findOne({
      where: { UID: uid },
    });

    if (account) {
      await rprofilelist.update(
        { AccountCert: accountcert },
        { where: { AccountID: account.AccountID } }
      );

      const updatedAccount = await rprofilelist.findOne({
        where: { AccountID: account.AccountID },
      });

      return res.status(200).json(updatedAccount);
    }

    return res.sendStatus(404);
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
      Urgent,
    });

    const metadata = await userlist.findOne({
      where: { UID },
    });

    const donoDriveWithMetadata = {
      ...donoDrive.toJSON(),
      metadata: metadata ? metadata.MetaData : null,
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

    const creatorIds = donoDrives.map((drive) => drive.AccountID);
    const recipientNames = await rprofilelist.findAll({
      where: { AccountID: creatorIds },
    });

    const userIds = recipientNames.map((recipient) => recipient.UID);
    const metadataList = await userlist.findAll({
      where: { UID: userIds },
    });

    const DrivesWithNamesAndToGo = donoDrives.map((drive) => {
      const recipientName = recipientNames.find(
        (creator) => creator.AccountID === drive.AccountID
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
        DriveID: drive.DriveID,
        AccountID: drive.AccountID,
        DriveName: drive.DriveName,
        Intro: drive.Intro,
        Cause: drive.Cause,
        DriveImage: drive.DriveImage,
        Documents: drive.Documents,
        Summary: drive.Summary,
        DateTarget: drive.DateTarget,
        name: recipientName ? recipientName.Name : null,
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

    const creatorIds = donoDrives.map((drive) => drive.AccountID);
    const recipientNames = await rprofilelist.findAll({
      where: { AccountID: creatorIds },
    });

    const metadataPromises = recipientNames.map((recipient) => {
      return userlist.findOne({
        where: { UID: recipient.UID },
      });
    });

    const metadataResults = await Promise.all(metadataPromises);

    const DriveswInfo = donoDrives.map((drive) => {
      const recipientName = recipientNames.find(
        (creator) => creator.AccountID === drive.AccountID
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
        AccountID: drive.AccountID,
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

    const creatorIds = donoDrives.map((drive) => drive.AccountID);
    const recipientNames = await rprofilelist.findAll({
      where: { AccountID: creatorIds },
    });

    const userIds = recipientNames.map((recipient) => recipient.UID);
    const metadataList = await userlist.findAll({
      where: { UID: userIds },
    });

    const dinfo = donoDrives.map((drive) => {
      const recipientName = recipientNames.find(
        (creator) => creator.AccountID === drive.AccountID
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
        AccountID: drive.AccountID,
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
app.get("/donodrive/specific/:accountID", async (req, res) => {
  try {
    const accountID = req.params.accountID;

    const drives = await DonoDrive.findAll({
      where: { AccountID: accountID },
    });

    if (!drives || drives.length === 0) {
      return res.status(404).json({ error: "DonoDrive records not found" });
    }

    const creatorIds = drives.map((drive) => drive.AccountID);
    const recipientNames = await rprofilelist.findAll({
      where: { AccountID: creatorIds },
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
          (creator) => creator.AccountID === drive.AccountID
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
          AccountID: drive.AccountID,
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

    const recipientName = await rprofilelist.findOne({
      where: { AccountID: drive.AccountID },
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
      AccountID: drive.AccountID,
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

app.put("/donodrive/rename/:driveId", authToken, async (req, res) => {
  const { driveId } = req.params;
  const { driveName } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    const AccountID = existingAccount.AccountID;

    // Find the specific drive by DriveID
    const drive = await DonoDrive.findByPk(driveId);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Check if AccountID matches
    if (drive.AccountID !== AccountID) {
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

app.put("/donodrive/intro/:driveId", authToken, async (req, res) => {
  const { driveId } = req.params;
  const { intro } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    const AccountID = existingAccount.AccountID;

    // Find the specific drive by DriveID
    const drive = await DonoDrive.findByPk(driveId);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Check if AccountID matches
    if (drive.AccountID !== AccountID) {
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

app.put("/donodrive/cause/:driveId", authToken, async (req, res) => {
  const { driveId } = req.params;
  const { cause } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    const AccountID = existingAccount.AccountID;

    // Find the specific drive by DriveID
    const drive = await DonoDrive.findByPk(driveId);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Check if AccountID matches
    if (drive.AccountID !== AccountID) {
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

app.put("/donodrive/driveimage/:driveId", authToken, async (req, res) => {
  const { driveId } = req.params;
  const { driveImage } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    const AccountID = existingAccount.AccountID;

    // Find the specific drive by DriveID
    const drive = await DonoDrive.findByPk(driveId);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Check if AccountID matches
    if (drive.AccountID !== AccountID) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    drive.DriveImage = driveImage;
    await drive.save();

    res.json(drive);
  } catch (error) {
    console.error("Error updating drive:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/donodrive/documents/:driveId", authToken, async (req, res) => {
  const { driveId } = req.params;
  const { documents } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    const AccountID = existingAccount.AccountID;

    // Find the specific drive by DriveID
    const drive = await DonoDrive.findByPk(driveId);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Check if AccountID matches
    if (drive.AccountID !== AccountID) {
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
app.put("/donodrive/summary/:driveId", authToken, async (req, res) => {
  const { driveId } = req.params;
  const { summary } = req.body;

  try {
    const UID = req.user.id;
    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Unauthorized" });
    }

    const AccountID = existingAccount.AccountID;

    // Find the specific drive by DriveID
    const drive = await DonoDrive.findByPk(driveId);

    if (!drive) {
      return res.status(404).json({ error: "Drive not found" });
    }

    // Check if AccountID matches
    if (drive.AccountID !== AccountID) {
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

    const existingAccount = await rprofilelist.findOne({
      where: { UID },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: "Account not found" });
    }

    const AccountID = existingAccount.AccountID;

    // Check of AccountID  and rprofilelist table
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
  const DonorID = req.user.id;

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
// Transactions of specific drive
app.get("/transact/drive/:driveId", async (req, res) => {
  const driveId = req.params.driveId;

  try {
    const driveTransactions = await transactions.findAll({
      where: {
        DriveID: driveId,
      },
    });

    const donorIds = driveTransactions.map(
      (transaction) => transaction.DonorID
    );
    const donorNames = await dprofilelist.findAll({
      where: { DonorID: donorIds },
    });

    const driveIds = driveTransactions.map(
      (transaction) => transaction.DriveID
    );
    const driveNames = await DonoDrive.findAll({
      where: { DriveID: driveIds },
    });

    const twinfo = driveTransactions.map((transaction) => {
      const donorName = donorNames.find(
        (donor) => donor.DonorID === transaction.DonorID
      );
      const driveName = driveNames.find(
        (drive) => drive.DriveID === transaction.DriveID
      );

      return {
        TransactionID: transaction.TransactionID,
        DriveID: transaction.DriveID,
        DonorID: transaction.DonorID,
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

app.get("/transact/ofdonor/:donorId", async (req, res) => {
  const donorId = req.params.donorId;

  try {
    const driveTransactions = await transactions.findAll({
      where: {
        DonorID: donorId,
      },
    });

    const donorName = await dprofilelist.findOne({
      where: { DonorID: donorId },
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
        DonorID: transaction.DonorID,
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

    const donorIds = driveTransactions.map(
      (transaction) => transaction.DonorID
    );
    const donorNames = await dprofilelist.findAll({
      where: { DonorID: donorIds },
    });

    const driveIds = driveTransactions.map(
      (transaction) => transaction.DriveID
    );
    const driveNames = await DonoDrive.findAll({
      where: { DriveID: driveIds },
    });

    const twinfo = driveTransactions.map((transaction) => {
      const donorName = donorNames.find(
        (donor) => donor.DonorID === transaction.DonorID
      );
      const driveName = driveNames.find(
        (drive) => drive.DriveID === transaction.DriveID
      );

      return {
        TransactionID: transaction.TransactionID,
        DriveID: transaction.DriveID,
        DonorID: transaction.DonorID,
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
  console.log("=================\x1b[33mVersion 2\x1b[37m================");
  console.log("\x1b[37m##########################################");
});
