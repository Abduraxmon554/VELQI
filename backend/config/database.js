const mongoose = require("mongoose");
const winston = require("winston");

// Vercel serverless muhitida MongoDB buffering qotib qolmasligi uchun
mongoose.set("bufferCommands", false);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: process.env.VERCEL
    ? [new winston.transports.Console()]
    : [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/combined.log" })
      ]
});

// Admin foydalanuvchisi har doim mavjud va paroli Abdurahmon2013 bo\x27lishini kafolatlaydi
const ensureAdmin = async () => {
  try {
    const User = require("../models/User");
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@eduplatform.uz").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "Abdurahmon2013";

    let admin = await User.findOne({
      $or: [
        { role: "admin" },
        { email: adminEmail },
        { email: "admin" }
      ]
    });

    if (!admin) {
      admin = new User({
        name: process.env.ADMIN_NAME || "Administrator",
        email: adminEmail,
        role: "admin",
        isVerified: true,
        isActive: true
      });
    }

    admin.password = adminPassword;
    admin.role = "admin";
    admin.isVerified = true;
    admin.isActive = true;
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();
    logger.info(`✅ Admin hisobi faol: Login="admin" yoki "${admin.email}", Parol="${adminPassword}"`);
  } catch (err) {
    logger.warn(`Admin hisobini tekshirishda ogohlantirish: ${err.message}`);
  }
};

let retryTimer = null;
let cachedConn = null;

const connectDB = async () => {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/eduplatform", {
      serverSelectionTimeoutMS: 3000,
      bufferCommands: false
    });
    cachedConn = conn;
    logger.info(`MongoDB ulandi: ${conn.connection.host}`);
    await ensureAdmin();
    return conn;
  } catch (error) {
    logger.warn(`MongoDB ulanish ogohlantirishi: ${error.message}`);
    return null;
  }
};

module.exports = { connectDB, logger, ensureAdmin };
