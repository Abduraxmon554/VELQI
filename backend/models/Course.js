const mongoose = require('mongoose');
const { getHourlyRate } = require('../utils/pricing');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Dars nomi kiritish majburiy'],
    trim: true
  },
  description: String,
  videoUrl: String,
  videoPublicId: String,
  duration: Number, // daqiqalarda
  content: String, // HTML/Markdown kontent
  resources: [{
    title: String,
    url: String,
    type: { type: String, enum: ['pdf', 'link', 'code', 'other'] }
  }],
  quiz: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String
  }],
  isPreview: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 70000
  },
  isPaidLesson: {
    type: Boolean,
    default: true
  },
  order: Number
}, { timestamps: true });

const sectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  lessons: [lessonSchema],
  order: Number
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Kurs nomi kiritish majburiy'],
    trim: true,
    maxlength: [100, 'Kurs nomi 100 belgidan oshmasin']
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Kurs tavsifi kiritish majburiy'],
    maxlength: [2000, 'Tavsif 2000 belgidan oshmasin']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Qisqa tavsif 200 belgidan oshmasin']
  },
  thumbnail: {
    type: String,
    default: '/images/default-course.jpg'
  },
  previewVideo: String,
  instructor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: [true, 'Kategoriya tanlash majburiy'],
    enum: ['frontend', 'nodejs', 'backend', 'ai-ml', 'design', 'cybersecurity', 'other']
  },
  subcategory: String,
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'beginner'
  },
  language: {
    type: String,
    default: 'uzbek'
  },
  tags: [String],
  price: {
    type: Number,
    required: [true, 'Narx kiritish majburiy'],
    min: [0, 'Narx 0 dan kam bo\'lmasin'],
    default: 70000
  },
  pricePerLesson: {
    type: Number,
    default: 70000
  },
  allowSingleLessonPurchase: {
    type: Boolean,
    default: true
  },
  discountPrice: {
    type: Number,
    default: 0
  },
  discountExpiry: Date,
  currency: {
    type: String,
    default: 'UZS'
  },
  isFree: {
    type: Boolean,
    default: false
  },
  sections: [sectionSchema],
  requirements: [String],
  objectives: [String],
  targetAudience: [String],
  totalDuration: {
    type: Number,
    default: 0
  },
  totalLessons: {
    type: Number,
    default: 0
  },
  enrolledStudents: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  certificate: {
    type: Boolean,
    default: true
  },
  whatYouLearn: [String],
  bestseller: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Slug yaratish
courseSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// Virtual: haqiqiy narx
courseSchema.virtual('currentPrice').get(function() {
  if (this.isFree) return 0;
  return getHourlyRate(this.category);
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
