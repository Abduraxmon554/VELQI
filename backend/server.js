require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const { execFile } = require('child_process');
const { connectDB, logger } = require('./config/database');
const passport = require('./config/passport');

// Route imports
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const toolRoutes = require('./routes/toolRoutes');
const infoPages = require('./utils/infoPages');
const requireAdminPage = require('./middleware/adminPage');

// Middleware imports
const { errorHandler, notFound, generalLimiter } = require('./middleware/security');

// Database connection
connectDB();

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

// ============================================================
// XAVFSIZLIK MIDDLEWARE
// ============================================================

// Helmet - HTTP header xavfsizligi
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      // Sahifalardagi onclick="..." tugmalari (qora/oq rejim, savat, kod ishga tushirish) ishlashi uchun shart
      scriptSrcAttr: ["'unsafe-inline'"],
      // localhost (http) da CSS/JS yuklanmay qolmasligi uchun faqat production'da https'ga majburlanadi
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "about:", "https://js.stripe.com", "https://www.youtube-nocookie.com", "https://player.vimeo.com"],
      mediaSrc: ["'self'", "https:", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Kompressiya
app.use(compression());

// Morgan - HTTP log
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Session
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'eduplatform_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
};

// Sessiyalar faqat Google OAuth uchun kerak (asosiy kirish JWT orqali). MongoDB sessiya do'koni
// faqat production'da ishlatiladi, shunda MongoDB o'chiq bo'lsa ham lokal sayt ochiladi.
if (process.env.MONGO_URI && process.env.NODE_ENV === 'production') {
  try {
    const store = MongoStore.create({ mongoUrl: process.env.MONGO_URI, touchAfter: 24 * 3600 });
    if (store.clientP) store.clientP.catch(() => {});
    if (store.collectionP) store.collectionP.catch(() => {});
    sessionConfig.store = store;
  } catch (err) {
    logger.warn('MongoStore initialize xatosi, MemoryStore ishlatiladi:', err.message);
  }
}

app.use(session(sessionConfig));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// NoSQL injection himoyasi
app.use(mongoSanitize());

// XSS himoyasi (kod maydoni va tarjimon matnini buzmaslik uchun /api/tools istisno)
const xssMiddleware = xssClean();
app.use((req, res, next) => (req.path.startsWith('/api/tools') ? next() : xssMiddleware(req, res, next)));

// HTTP Parameter Pollution himoyasi
app.use(hpp({
  whitelist: ['category', 'level', 'tags', 'sort']
}));

// Kod ishga tushirish va tarjima (o'z limiti bor)
app.use('/api/tools', toolRoutes);

// General rate limiter
app.use('/api', generalLimiter);

// ============================================================
// STATIK FAYLLAR
// ============================================================
app.use(express.static(path.join(__dirname, '../frontend/public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// ============================================================
// FRONTEND ROUTES (EJS sahifalar)
// ============================================================
app.get('/', (req, res) => res.render('pages/home', { title: 'VELQI - Online Ta\'lim' }));
app.get('/courses', (req, res) => res.render('pages/courses', { title: 'Kurslar' }));
app.get('/courses/:slug', (req, res) => res.render('pages/course-detail', { title: 'Kurs' }));
app.get('/login', (req, res) => res.render('pages/login', { title: 'Kirish' }));
app.get('/register', (req, res) => res.render('pages/register', { title: 'Ro\'yxatdan O\'tish' }));
app.get('/dashboard', (req, res) => res.render('pages/dashboard', { title: 'Dashboard' }));
app.get('/profile', (req, res) => res.render('pages/profile', { title: 'Profil' }));
app.get('/checkout', (req, res) => res.render('pages/checkout', { title: 'To\'lov' }));
app.get('/about', (req, res) => res.render('pages/about', { title: 'Biz Haqimizda' }));
app.get('/contact', (req, res) => res.render('pages/contact', { title: 'Aloqa' }));
app.get('/forgot-password', (req, res) => res.render('pages/forgot-password', { title: 'Parolni Tiklash' }));
app.get('/reset-password/:token', (req, res) => res.render('pages/reset-password', { title: 'Yangi Parol' }));
app.get('/verify-email/:token', (req, res) => res.render('pages/verify-email', { title: 'Email Tasdiqlash' }));
app.get('/my-courses', (req, res) => res.render('pages/my-courses', { title: 'Mening Kurslarim' }));
app.get('/learn/:courseId', (req, res) => res.render('pages/learn', { title: 'O\'rganish' }));
app.get('/cart', (req, res) => res.render('pages/cart', { title: 'Savat' }));
app.get('/wishlist', (req, res) => res.render('pages/wishlist', { title: 'Sevimlilar' }));
app.get('/certificate/:id', (req, res) => res.render('pages/certificate', { title: 'Sertifikat' }));
app.get('/playground', (req, res) => res.render('pages/playground', { title: 'Kod Mashqi & Terminal' }));
app.get('/translator', (req, res) => res.render('pages/translator', { title: 'Tarjimon' }));
app.get('/typing', (req, res) => res.render('pages/typing', { title: 'Tez yozish mashqi' }));

// Ma'lumot sahifalari (footer havolalari): faq, terms, privacy, refund, sitemap, careers, blog, press, affiliates
Object.keys(infoPages).forEach((slug) => {
  app.get('/' + slug, (req, res) => res.render('pages/info', { title: infoPages[slug].title.uz, slug, page: infoPages[slug] }));
});

// Admin routes
app.get('/admin/login', (req, res) => res.render('pages/admin/login', { title: 'Admin panelga kirish' }));
app.get('/admin', requireAdminPage, (req, res) => res.render('pages/admin/dashboard', { title: 'Admin Panel', currentAdminPage: 'dashboard' }));
app.get('/admin/courses', requireAdminPage, (req, res) => res.render('pages/admin/courses', { title: 'Kurslarni Boshqarish', currentAdminPage: 'courses' }));
app.get('/admin/users', requireAdminPage, (req, res) => res.render('pages/admin/users', { title: 'Foydalanuvchilar', currentAdminPage: 'users' }));
app.get('/admin/orders', requireAdminPage, (req, res) => res.render('pages/admin/orders', { title: 'Buyurtmalar', currentAdminPage: 'orders' }));

// ============================================================
// ERROR HANDLING
// ============================================================
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    logger.info(`🚀 Server ishga tushdi: ${url}`);
    logger.info(`📚 VELQI - Online Ta'lim Platformasi`);

    if (process.env.npm_lifecycle_event === 'start' && process.platform === 'darwin') {
      execFile('open', [url], (err) => {
        if (err) logger.warn(`Brauzerni avtomatik ochib bo'lmadi. Sayt manzili: ${url}. Sabab: ${err.message}`);
      });
    }
  });

  process.on('unhandledRejection', (err) => {
    const msg = (err && err.message) || String(err);
    if (err && (/^Mongo/.test(err.name || '') || /ECONNREFUSED|ENOTFOUND|ETIMEDOUT/.test(msg))) {
      logger.warn(`Ulanish xatosi (server ishlashda davom etadi): ${msg}`);
      return;
    }
    logger.error(`Unhandled Rejection: ${msg}`);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
  });
}

module.exports = app;
