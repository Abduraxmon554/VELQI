require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    console.error('ADMIN_EMAIL va kamida 12 belgili ADMIN_PASSWORD muhit o‘zgaruvchilarini sozlang.');
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eduplatform');
    let admin = await User.findOne({ email: email.toLowerCase() });
    if (!admin) admin = new User({ email: email.toLowerCase(), name: process.env.ADMIN_NAME || 'Administrator' });

    admin.password = password;
    admin.role = 'admin';
    admin.isVerified = true;
    admin.isActive = true;
    await admin.save();

    console.log(`Admin akkaunti tayyor: ${admin.email}`);
  } catch (error) {
    console.error('Admin akkauntini sozlashda xatolik:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
