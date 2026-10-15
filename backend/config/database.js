const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: process.env.VERCEL
    ? [new winston.transports.Console()]
    : [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
      ]
});

let retryTimer = null;
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eduplatform', {
      serverSelectionTimeoutMS: 5000
    });
    logger.info(`MongoDB ulandi: ${conn.connection.host}`);
    return true;
  } catch (error) {
    logger.error(`MongoDB xatosi: ${error.message}. MongoDB xizmatini yoqing (masalan: brew services start mongodb-community yoki mongod). Sayt ishlayveradi, 10 soniyadan keyin qayta ulanishga urinadi.`);
    if (!retryTimer) {
      retryTimer = setTimeout(() => { retryTimer = null; connectDB(); }, 10000);
      retryTimer.unref && retryTimer.unref();
    }
    return false;
  }
};

module.exports = { connectDB, logger };
