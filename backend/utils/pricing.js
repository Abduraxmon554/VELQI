const HOURLY_RATES = {
  default: 70000,
  cybersecurity: 150000
};

const getHourlyRate = (category) => (
  category === 'cybersecurity' ? HOURLY_RATES.cybersecurity : HOURLY_RATES.default
);

const getLessonPrice = (course, lesson) => {
  const duration = Number(lesson?.duration) || 60;
  return Math.ceil((duration * getHourlyRate(course.category)) / 60);
};

module.exports = { HOURLY_RATES, getHourlyRate, getLessonPrice };
