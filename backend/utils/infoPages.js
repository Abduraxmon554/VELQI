// Footer havolalari uchun ma'lumot sahifalari (uz / ru / en). Matnni bemalol tahrirlang.
const TG = '@Abdurahmon554';

const P = (title, intro, sections) => ({ title, intro, sections });

module.exports = {
  faq: {
    icon: 'fa-circle-question',
    title: { uz: "Ko'p So'raladigan Savollar", ru: 'Частые вопросы', en: 'Frequently Asked Questions' },
    uz: P(null, "Eng ko'p beriladigan savollarga javoblar.", [
      ["Kursga qanday yozilaman?", "Kursni tanlab, savatchaga qo'shing va to'lovga o'ting. Bepul kurslarga ro'yxatdan o'tgandan so'ng darhol yozilasiz."],
      ["To'lov qanday amalga oshiriladi?", `To'lov administrator orqali Telegram (${TG}) da tasdiqlanadi. To'lovdan keyin kurs hisobingizga ochiladi.`],
      ["Kiberxavfsizlik kursi narxi qancha?", "Oddiy darslar 70 000 so'm/soat, kiberxavfsizlik darslari 150 000 so'm/soat. To'lov dars davomiyligiga qarab hisoblanadi."],
      ["Sertifikat beriladimi?", "Ha, kursni tugatgach rasmiy sertifikat olasiz va uni PDF qilib saqlashingiz mumkin."],
      ["Pul qaytariladimi?", "30 kun ichida mamnun bo'lmasangiz, pul qaytariladi. Batafsil: Qaytarish siyosati."],
      ["Parolni unutsam-chi?", "Kirish sahifasidagi \"Parolni unutdingizmi?\" havolasidan foydalaning."]
    ]),
    ru: P(null, 'Ответы на самые частые вопросы.', [
      ['Как записаться на курс?', 'Выберите курс, добавьте его в корзину и перейдите к оплате. На бесплатные курсы вы записываетесь сразу после регистрации.'],
      ['Как проходит оплата?', `Оплата подтверждается через администратора в Telegram (${TG}). После оплаты курс откроется в вашем аккаунте.`],
      ['Сколько стоит курс по кибербезопасности?', 'Обычные уроки — 70 000 сум/час, уроки по кибербезопасности — 150 000 сум/час. Оплата считается по длительности урока.'],
      ['Выдаётся ли сертификат?', 'Да, после окончания курса вы получаете официальный сертификат и можете сохранить его в PDF.'],
      ['Вернут ли деньги?', 'Если вы не удовлетворены в течение 30 дней, мы вернём деньги. Подробнее: Политика возврата.'],
      ['Что делать, если забыл пароль?', 'Воспользуйтесь ссылкой «Забыли пароль?» на странице входа.']
    ]),
    en: P(null, 'Answers to the most common questions.', [
      ['How do I enrol in a course?', 'Pick a course, add it to your cart and proceed to payment. Free courses open immediately after you register.'],
      ['How does payment work?', `Payment is confirmed by an administrator on Telegram (${TG}). The course unlocks in your account after payment.`],
      ['How much does the cybersecurity course cost?', 'Regular lessons cost 70,000 UZS/hour, cybersecurity lessons 150,000 UZS/hour. You pay according to lesson duration.'],
      ['Do I get a certificate?', 'Yes. After finishing a course you receive an official certificate you can save as a PDF.'],
      ['Can I get a refund?', "If you're not satisfied within 30 days we refund you. See the Refund Policy for details."],
      ['I forgot my password. What now?', 'Use the "Forgot password?" link on the login page.']
    ])
  },
  terms: {
    icon: 'fa-file-contract',
    title: { uz: 'Foydalanish Shartlari', ru: 'Условия использования', en: 'Terms of Use' },
    uz: P(null, "VELQIdan foydalanish orqali siz quyidagi shartlarga rozi bo'lasiz.", [
      ["Hisob", "Ro'yxatdan o'tishda to'g'ri ma'lumot kiriting va parolingizni begonalarga bermang."],
      ["Kontent", "Kurs materiallari faqat shaxsiy o'qish uchun. Ularni nusxalash yoki sotish taqiqlanadi."],
      ["To'lov", "Narxlar saytda ko'rsatilgan. To'lov tasdiqlangandan keyin kurs ochiladi."],
      ["Taqiqlangan xatti-harakatlar", "Platformaga hujum qilish, boshqalar hisobiga kirish yoki zararli kod yuborish taqiqlanadi. Kod maydonidan faqat o'rganish uchun foydalaning."],
      ["O'zgarishlar", "Shartlar yangilanishi mumkin. Yangi shartlar shu sahifada e'lon qilinadi."]
    ]),
    ru: P(null, 'Используя VELQI, вы соглашаетесь со следующими условиями.', [
      ['Аккаунт', 'Указывайте достоверные данные при регистрации и не передавайте пароль третьим лицам.'],
      ['Контент', 'Материалы курсов предназначены только для личного обучения. Копирование и продажа запрещены.'],
      ['Оплата', 'Цены указаны на сайте. Курс открывается после подтверждения оплаты.'],
      ['Запрещённые действия', 'Запрещены атаки на платформу, доступ к чужим аккаунтам и отправка вредоносного кода. Используйте редактор кода только для обучения.'],
      ['Изменения', 'Условия могут обновляться. Новые условия публикуются на этой странице.']
    ]),
    en: P(null, 'By using VELQI you agree to the following terms.', [
      ['Account', 'Provide accurate information when registering and do not share your password.'],
      ['Content', 'Course materials are for personal learning only. Copying or reselling them is prohibited.'],
      ['Payment', 'Prices are shown on the site. A course unlocks once payment is confirmed.'],
      ['Prohibited conduct', 'Attacking the platform, accessing other accounts or submitting malicious code is prohibited. Use the code playground for learning only.'],
      ['Changes', 'These terms may be updated. New terms will be published on this page.']
    ])
  },
  privacy: {
    icon: 'fa-user-shield',
    title: { uz: 'Maxfiylik Siyosati', ru: 'Политика конфиденциальности', en: 'Privacy Policy' },
    uz: P(null, "Ma'lumotlaringiz xavfsizligi biz uchun muhim.", [
      ["Qanday ma'lumot yig'amiz", "Ism, email, telefon raqami va kurs bo'yicha progressingiz."],
      ["Nimaga ishlatamiz", "Hisobingizni boshqarish, to'lovlarni tasdiqlash va sizga yordam ko'rsatish uchun."],
      ["Uchinchi tomonlar", "Ma'lumotlaringiz sotilmaydi. Faqat to'lov va email yuborish xizmatlari bilan zarur hajmda bo'lishiladi."],
      ["Xavfsizlik", "Parollar shifrlangan holda saqlanadi."],
      ["Aloqa", `Savollar uchun: info@eduplatform.uz yoki Telegram ${TG}.`]
    ]),
    ru: P(null, 'Безопасность ваших данных важна для нас.', [
      ['Какие данные мы собираем', 'Имя, email, номер телефона и ваш прогресс по курсам.'],
      ['Зачем мы их используем', 'Для управления аккаунтом, подтверждения оплат и поддержки.'],
      ['Третьи лица', 'Данные не продаются. Они передаются только платёжным и почтовым сервисам в необходимом объёме.'],
      ['Безопасность', 'Пароли хранятся в зашифрованном виде.'],
      ['Контакты', `По вопросам: info@eduplatform.uz или Telegram ${TG}.`]
    ]),
    en: P(null, 'The security of your data matters to us.', [
      ['What we collect', 'Name, email, phone number and your course progress.'],
      ['How we use it', 'To manage your account, confirm payments and provide support.'],
      ['Third parties', 'Your data is never sold. It is shared only with payment and email services to the extent necessary.'],
      ['Security', 'Passwords are stored encrypted.'],
      ['Contact', `Questions: info@eduplatform.uz or Telegram ${TG}.`]
    ])
  },
  refund: {
    icon: 'fa-rotate-left',
    title: { uz: 'Qaytarish Siyosati', ru: 'Политика возврата', en: 'Refund Policy' },
    uz: P(null, "Mamnun bo'lmasangiz, pulingizni qaytaramiz.", [
      ["30 kunlik kafolat", "To'lovdan keyin 30 kun ichida mamnun bo'lmasangiz, to'lov qaytariladi."],
      ["Shartlar", "Kursning katta qismi ko'rilmagan bo'lishi va sertifikat olinmagan bo'lishi kerak."],
      ["Qanday so'raladi", `Telegram ${TG} yoki info@eduplatform.uz orqali buyurtma raqami bilan yozing.`],
      ["Muddat", "So'rov ko'rib chiqilgach, pul 3-5 ish kuni ichida qaytariladi."]
    ]),
    ru: P(null, 'Если вы не удовлетворены, мы вернём деньги.', [
      ['30 дней гарантии', 'Если вы не удовлетворены в течение 30 дней после оплаты, платёж будет возвращён.'],
      ['Условия', 'Большая часть курса не должна быть просмотрена, а сертификат — не получен.'],
      ['Как запросить', `Напишите в Telegram ${TG} или на info@eduplatform.uz с номером заказа.`],
      ['Сроки', 'После рассмотрения запроса деньги возвращаются в течение 3–5 рабочих дней.']
    ]),
    en: P(null, "If you're not satisfied, we'll refund you.", [
      ['30-day guarantee', "If you're not satisfied within 30 days of payment, you get a refund."],
      ['Conditions', 'Most of the course must be unwatched and no certificate issued.'],
      ['How to request', `Message Telegram ${TG} or info@eduplatform.uz with your order number.`],
      ['Timing', 'After review, the refund is issued within 3–5 business days.']
    ])
  },
  sitemap: {
    icon: 'fa-sitemap',
    title: { uz: 'Sayt Xaritasi', ru: 'Карта сайта', en: 'Sitemap' },
    links: [
      ['/', { uz: 'Bosh sahifa', ru: 'Главная', en: 'Home' }],
      ['/courses', { uz: 'Kurslar', ru: 'Курсы', en: 'Courses' }],
      ['/playground', { uz: 'Kod Mashqi', ru: 'Редактор кода', en: 'Code Playground' }],
      ['/translator', { uz: 'Tarjimon', ru: 'Переводчик', en: 'Translator' }],
      ['/typing', { uz: 'Tez yozish', ru: 'Скоропечатание', en: 'Typing practice' }],
      ['/about', { uz: 'Biz Haqimizda', ru: 'О нас', en: 'About us' }],
      ['/contact', { uz: 'Aloqa', ru: 'Контакты', en: 'Contact' }],
      ['/faq', { uz: "Ko'p So'raladigan Savollar", ru: 'Частые вопросы', en: 'FAQ' }],
      ['/terms', { uz: 'Foydalanish Shartlari', ru: 'Условия использования', en: 'Terms of Use' }],
      ['/privacy', { uz: 'Maxfiylik Siyosati', ru: 'Политика конфиденциальности', en: 'Privacy Policy' }],
      ['/refund', { uz: 'Qaytarish Siyosati', ru: 'Политика возврата', en: 'Refund Policy' }],
      ['/login', { uz: 'Kirish', ru: 'Вход', en: 'Log in' }],
      ['/register', { uz: "Ro'yxatdan O'tish", ru: 'Регистрация', en: 'Sign up' }]
    ]
  },
  careers: {
    icon: 'fa-briefcase',
    title: { uz: 'Vakansiyalar', ru: 'Вакансии', en: 'Careers' },
    uz: P(null, "Jamoamizga qo'shiling.", [["Hozirgi holat", `Hozircha ochiq vakansiya yo'q. Rezyumeingizni ${TG} (Telegram) yoki info@eduplatform.uz ga yuborishingiz mumkin.`]]),
    ru: P(null, 'Присоединяйтесь к нашей команде.', [['Текущая ситуация', `Открытых вакансий пока нет. Резюме можно отправить в Telegram ${TG} или на info@eduplatform.uz.`]]),
    en: P(null, 'Join our team.', [['Current status', `There are no open positions right now. You can send your CV to Telegram ${TG} or info@eduplatform.uz.`]])
  },
  blog: {
    icon: 'fa-newspaper',
    title: { uz: 'Blog', ru: 'Блог', en: 'Blog' },
    uz: P(null, 'Maqolalar tez orada.', [["Tez orada", "Dasturlash, kiberxavfsizlik va karyera haqida maqolalar shu yerda e'lon qilinadi."]]),
    ru: P(null, 'Статьи скоро появятся.', [['Скоро', 'Здесь будут публиковаться статьи о программировании, кибербезопасности и карьере.']]),
    en: P(null, 'Articles coming soon.', [['Coming soon', 'Articles about programming, cybersecurity and careers will be published here.']])
  },
  press: {
    icon: 'fa-bullhorn',
    title: { uz: 'Matbuot', ru: 'Пресса', en: 'Press' },
    uz: P(null, 'Matbuot xizmati.', [["Aloqa", `Matbuot so'rovlari uchun info@eduplatform.uz yoki Telegram ${TG}.`]]),
    ru: P(null, 'Пресс-служба.', [['Контакты', `Для запросов прессы: info@eduplatform.uz или Telegram ${TG}.`]]),
    en: P(null, 'Press office.', [['Contact', `For press enquiries: info@eduplatform.uz or Telegram ${TG}.`]])
  },
  affiliates: {
    icon: 'fa-handshake',
    title: { uz: 'Hamkorlik', ru: 'Сотрудничество', en: 'Partnerships' },
    uz: P(null, 'Birgalikda ishlaymiz.', [["Hamkorlik", `Maktab, o'quv markazi yoki kompaniya bo'lsangiz, ${TG} (Telegram) orqali bog'laning.`]]),
    ru: P(null, 'Работаем вместе.', [['Сотрудничество', `Если вы школа, учебный центр или компания, свяжитесь с нами в Telegram ${TG}.`]]),
    en: P(null, "Let's work together.", [['Partnerships', `If you're a school, training centre or company, contact us on Telegram ${TG}.`]])
  }
};
