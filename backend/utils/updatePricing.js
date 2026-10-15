require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const { getHourlyRate, getLessonPrice } = require('./pricing');

async function updatePricing() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eduplatform');
    const courses = await Course.find();

    for (const course of courses) {
      const hourlyRate = getHourlyRate(course.category);
      course.price = course.isFree ? 0 : hourlyRate;
      course.pricePerLesson = hourlyRate;
      course.discountPrice = 0;
      course.sections.forEach(section => {
        section.lessons.forEach(lesson => {
          lesson.price = getLessonPrice(course, lesson);
        });
      });
      await course.save();
    }

    console.log(`${courses.length} ta kurs narxi soatbay tarifga yangilandi.`);
  } catch (error) {
    console.error('Narxlarni yangilashda xatolik:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

updatePricing();
