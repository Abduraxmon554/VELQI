require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const { logger } = require('../config/database');
const { getLessonPrice } = require('./pricing');

const seedData = async () => {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 12) {
      throw new Error('ADMIN_PASSWORD muhit o‘zgaruvchisiga kamida 12 belgili parol kiriting.');
    }

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eduplatform');
    console.log('MongoDB ulandi. Ma\'lumotlar tozalanmoqda...');

    await User.deleteMany();
    await Course.deleteMany();

    // 1. O'qituvchi va foydalanuvchilarni yaratish
    const adminUser = await User.create({
      name: 'Admin Adminov',
      email: process.env.ADMIN_EMAIL || 'admin@eduplatform.uz',
      password: adminPassword,
      role: 'admin',
      isVerified: true
    });

    const cybersecurityInstructor = await User.create({
      name: 'Amir Nazarov (CyberSec Expert)',
      email: 'amir@eduplatform.uz',
      password: 'password123',
      role: 'instructor',
      bio: 'Certified Ethical Hacker (CEH), 8 yillik xalqaro bank xavfsizligi mutaxassisi.',
      avatar: '/images/default-avatar.svg',
      isVerified: true
    });

    const aiInstructor = await User.create({
      name: 'Dilnoza Yusupova (AI Researcher)',
      email: 'dilnoza@eduplatform.uz',
      password: 'password123',
      role: 'instructor',
      bio: 'Machine Learning & Deep Learning bo\'yicha xalqaro darajadagi mutaxassis.',
      avatar: '/images/default-avatar.svg',
      isVerified: true
    });

    const frontendInstructor = await User.create({
      name: 'Jasur Xoliqov (Senior Frontend)',
      email: 'jasur@eduplatform.uz',
      password: 'password123',
      role: 'instructor',
      bio: 'React, Vue va Next.js bo\'yicha 6 yillik tajribaga ega frontend arxitektor.',
      avatar: '/images/default-avatar.svg',
      isVerified: true
    });

    const studentUser = await User.create({
      name: 'Abdurahmon Talaba',
      email: 'student@eduplatform.uz',
      password: 'password123',
      role: 'student',
      isVerified: true
    });

    // 2. Kiberxavfsizlik kursi: 150 000 so'm / soat
    const cyberSecurityCourse = await Course.create({
      title: 'Kiberxavfsizlik va Ethical Hacking',
      slug: 'kiberxavfsizlik-ethical-hacking',
      description: 'Professional darajadagi kiberxavfsizlik kursi: tarmoq xavfsizligi, OWASP Top 10, penetration testing, kriptografiya va himoya usullari. Narx: 150 000 so\'m / soat.',
      shortDescription: 'Professional kiberxavfsizlik. Amaliy laboratoriyalar va 150 000 so\'m / soat narx.',
      category: 'cybersecurity',
      level: 'intermediate',
      language: 'uzbek',
      instructor: cybersecurityInstructor._id,
      price: 150000,
      discountPrice: 0,
      pricePerLesson: 150000,
      allowSingleLessonPurchase: true,
      currency: 'UZS',
      isFree: false,
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      bestseller: true,
      rating: 4.9,
      numReviews: 48,
      enrolledStudents: 1420,
      totalLessons: 10,
      totalDuration: 1200,
      whatYouLearn: [
        'Ethical Hacking asoslari va qonuniy mezonlar',
        'Tarmoq protokollari va Wireshark yordamida trafik tahlili',
        'Linux (Kali Linux) operatsion tizimida xavfsizlik asboblari',
        'OWASP Top 10 veb zaifliklari (SQL Injection, XSS, CSRF)',
        'Penetration testing bosqichlari va hisobot tayyorlash',
        'Tizim va serverlarni xakerlik hujumlaridan himoyalash'
      ],
      sections: [
        {
          title: '1-Bo\'lim: Kiberxavfsizlikka Kirish va Laboratoriya',
          description: 'Ethical Hacking asoslari va Kali Linux o\'rnatish',
          order: 1,
          lessons: [
            {
              title: '1-Dars: Kiberxavfsizlik nima? Xakerlar turlari va qonunchilik',
              description: 'Oq, qora va kulrang xakerlar, O\'zbekiston va xalqaro kiber jinoyatchilik qonunlari.',
              duration: 45,
              price: 150000,
              isPaidLesson: true,
              isPreview: true, // Kirish darsi bepul ko'rish uchun ochiq
              content: 'Ushbu darsda kiberxavfsizlikning fundamental tamoyillari (CIA triad: Maxfiylik, Butunlik, Foydalanish imkoniyati) o\'rganiladi.',
              order: 1
            },
            {
              title: '2-Dars: VirtualBox va Kali Linux laboratoriyasini sozlash',
              description: 'Xavfsiz amaliyot uchun virtual muhit tayyorlash.',
              duration: 55,
              price: 150000,
              isPaidLesson: true,
              isPreview: false,
              content: 'Kali Linux vositalari bilan ishlash va snapshotlar olish.',
              order: 2
            }
          ]
        },
        {
          title: '2-Bo\'lim: Tarmoq Xavfsizligi va Skannerlash',
          description: 'Nmap, Wireshark va tarmoq zaifliklarini skanerlash',
          order: 2,
          lessons: [
            {
              title: '3-Dars: Nmap orqali tarmoq va ochiq portlarni skanerlash',
              description: 'TCP/UDP portlar, xizmat versiyalari va OS aniqlash.',
              duration: 60,
              price: 150000,
              isPaidLesson: true,
              isPreview: false,
              content: 'Nmap skript dvigateli (NSE) yordamida zaifliklarni aniqlash.',
              order: 3
            },
            {
              title: '4-Dars: Wireshark bilan tarmoq paketlarini tahlil qilish',
              description: 'Shifrlanmagan parollar va xavfli so\'rovlarni aniqlash.',
              duration: 50,
              price: 150000,
              isPaidLesson: true,
              isPreview: false,
              content: 'Man-in-the-Middle hujumlaridan himoyalanish tahlili.',
              order: 4
            }
          ]
        },
        {
          title: '3-Bo\'lim: Veb Xavfsizlik va OWASP Top 10',
          description: 'Veb ilovalardagi zaifliklar va ulardan himoyalanish',
          order: 3,
          lessons: [
            {
              title: '5-Dars: SQL Injection (SQLi) zaifligi va himoyalanish',
              description: 'Ma\'lumotlar bazasiga noqonuniy kirish va Prepared Statements.',
              duration: 75,
              price: 150000,
              isPaidLesson: true,
              isPreview: false,
              content: 'SQL injection orqali admin parollarini olish va xavfsiz kod yozish.',
              order: 5
            },
            {
              title: '6-Dars: Cross-Site Scripting (XSS) va CSRF hujumlari',
              description: 'Mijoz tomonidagi zaifliklar va Cookie xavfsizligi.',
              duration: 65,
              price: 150000,
              isPaidLesson: true,
              isPreview: false,
              content: 'Stored, Reflected va DOM XSS tahlili va sanitizatsiya.',
              order: 6
            },
            {
              title: '7-Dars: Burp Suite vositasida veb zaifliklarni topish',
              description: 'HTTP so\'rovlarni ushlash va qayta ishlash.',
              duration: 70,
              price: 150000,
              isPaidLesson: true,
              isPreview: false,
              content: 'Burp Repeater va Intruder modullari bilan ishlash.',
              order: 7
            }
          ]
        },
        {
          title: '4-Bo\'lim: Tizim Himoyasi va Incident Response',
          description: 'Serverlarni mustahkamlash (Hardening) va himoya choralari',
          order: 4,
          lessons: [
            {
              title: '8-Dars: Parollar xavfsizligi va Brute-force hujumlaridan himoya',
              description: 'Rate limiting, 2FA va kuchli parollar siyosati.',
              duration: 50,
              price: 150000,
              isPaidLesson: true,
              isPreview: false,
              content: 'Hydra va fail2ban vositalari bilan ishlash.',
              order: 8
            },
            {
              title: '9-Dars: Firewall (Xavfsizlik devori) va SSL/TLS shifrlash',
              description: 'UFW, iptables va HTTPS protokoli xavfsizligi.',
              duration: 55,
              price: 150000,
              isPaidLesson: true,
              isPreview: false,
              content: 'Sertifikatlarni to\'g\'ri sozlash va portlarni yopish.',
              order: 9
            },
            {
              title: '10-Dars: Yakuniy Amaliy Imtihon (CTF) va Sertifikat topshirish',
              description: 'Haqiqiy zaif serverni tekshirish va xavfsizlik hisoboti yozish.',
              duration: 90,
              price: 150000,
              isPaidLesson: true,
              isPreview: false,
              content: 'Professional hisobot va sertifikat olish imtihoni.',
              order: 10
            }
          ]
        }
      ]
    });
    const applyHourlyLessonPrices = async (course) => {
      course.sections.forEach(section => {
        section.lessons.forEach(lesson => {
          lesson.price = getLessonPrice(course, lesson);
        });
      });
      await course.save();
    };
    await applyHourlyLessonPrices(cyberSecurityCourse);

    // 3. Frontend kursi
    const frontendCourse = await Course.create({
      title: 'Frontend Dasturlash: HTML, CSS, JavaScript va React',
      slug: 'frontend-react-dasturlash',
      description: 'Zamonaviy veb-saytlar yaratish uchun eng to\'liq frontend kursi.',
      shortDescription: '0 dan React.js professional dasturchi darajasigacha.',
      category: 'frontend',
      level: 'beginner',
      language: 'uzbek',
      instructor: frontendInstructor._id,
      price: 70000,
      discountPrice: 0,
      pricePerLesson: 70000,
      currency: 'UZS',
      isFree: false,
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      rating: 4.8,
      numReviews: 124,
      enrolledStudents: 3450,
      totalLessons: 45,
      sections: [
        {
          title: 'HTML5 va CSS3',
          description: 'Veb sahifalar tuzilmasi',
          order: 1,
          lessons: [
            { title: 'HTML teglari va semantika', duration: 30, isPreview: true, order: 1 },
            { title: 'CSS Flexbox va Grid', duration: 45, isPreview: false, order: 2 }
          ]
        }
      ]
    });
    await applyHourlyLessonPrices(frontendCourse);

    // 4. Node.js & Backend kursi
    await Course.create({
      title: 'Node.js, Express va MongoDB - Katta Backend Loyihalar',
      slug: 'nodejs-express-mongodb-backend',
      description: 'Yuqori yuklamalarga chidamli backend tizimlari va REST API lar yaratish.',
      shortDescription: 'Node.js bilan xavfsiz va tezkor API serverlar qurish.',
      category: 'nodejs',
      level: 'intermediate',
      language: 'uzbek',
      instructor: adminUser._id,
      price: 70000,
      discountPrice: 0,
      pricePerLesson: 70000,
      currency: 'UZS',
      isFree: false,
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      rating: 4.9,
      numReviews: 89,
      enrolledStudents: 2310,
      totalLessons: 32
    });

    // 5. AI va Machine Learning kursi
    await Course.create({
      title: 'Sun\'iy Intellekt va Machine Learning (Python)',
      slug: 'ai-machine-learning-python',
      description: 'Neyron tarmoqlar, Deep Learning, kompyuter ko\'rishi va LLM modellar bilan ishlash.',
      shortDescription: 'Python, NumPy, Pandas, TensorFlow va PyTorch bilan sun\'iy intellekt.',
      category: 'ai-ml',
      level: 'intermediate',
      language: 'uzbek',
      instructor: aiInstructor._id,
      price: 70000,
      discountPrice: 0,
      pricePerLesson: 70000,
      currency: 'UZS',
      isFree: false,
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      rating: 4.9,
      numReviews: 76,
      enrolledStudents: 1850,
      totalLessons: 40
    });

    // 6. Grafik Dizayn va UI/UX kursi
    await Course.create({
      title: 'Grafik Dizayn va UI/UX: Figma & Photoshop',
      slug: 'grafik-dizayn-uiux-figma',
      description: 'Zamonaviy mobil ilovalar va veb-saytlar dizaynini yaratish.',
      shortDescription: 'Figma, Adobe Photoshop va Illustrator bilan professional dizayn.',
      category: 'design',
      level: 'beginner',
      language: 'uzbek',
      instructor: frontendInstructor._id,
      price: 70000,
      discountPrice: 0,
      pricePerLesson: 70000,
      currency: 'UZS',
      isFree: false,
      isPublished: true,
      isApproved: true,
      isFeatured: true,
      rating: 4.7,
      numReviews: 54,
      enrolledStudents: 1640,
      totalLessons: 28
    });

    console.log('✅ Barcha kurslar va ma\'lumotlar muvaffaqiyatli yuklandi!');
    console.log('🔐 Soatbay narxlar: odatiy kurslar 70 000, kiberxavfsizlik 150 000 so\'m.');
    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error.message);
    process.exit(1);
  }
};

seedData();
