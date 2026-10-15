# VELQI

## Ishga tushirish
1. MongoDB ni yoqing (`brew services start mongodb-community` yoki `mongod`).
2. `npm install`
3. `npm run seed` (birinchi marta, kurslarni bazaga yozadi)
4. `npm start` → http://localhost:5000

MongoDB o'chiq bo'lsa ham sayt ochiladi, 10 soniyada bir marta qayta ulanishga urinadi.

## Vercel'ga joylash
1. GitHub'dagi `Abduraxmon554/VELQI` repozitoriyasini Vercel'da import qiling.
2. Project Name sifatida kichik harfli `velqi` ni kiriting va Framework Preset'ni `Other` qilib tanlang. Root Directory `./` bo'lib qolsin; Build Command va Output Directory'ni bo'sh qoldiring.
3. Deploy qilishdan oldin Environment Variables bo'limiga `MONGO_URI`, `JWT_SECRET` va `SESSION_SECRET` ni kiriting. MongoDB Atlas kabi tashqi MongoDB kerak; `mongodb://localhost` Vercel'da ishlamaydi. `CLIENT_URL` va `PUBLIC_BASE_URL` ni deploy'dan keyin berilgan `https://...vercel.app` manziliga sozlang.
4. Google bilan kirish uchun Google Cloud Console'da OAuth 2.0 Web client yarating. Authorized redirect URI sifatida `https://your-project.vercel.app/api/auth/google/callback` ni qo'shing, so'ng `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` va aynan shu manzilni `GOOGLE_CALLBACK_URL` sifatida Vercel Environment Variables'ga kiriting. `GOOGLE_CLIENT_SECRET`ni chatga yoki GitHub'ga joylamang. Google OAuth sozlanmaguncha login sahifasida Google tugmasi ko'rinmaydi.
5. Email, Click, Payme yoki Stripe ishlatilsa, tegishli kalitlarni ham Vercel Environment Variables'ga kiriting. `STRIPE_SECRET_KEY` sozlanmagan bo'lsa, Stripe endpointlari 503 qaytaradi, qolgan sayt ishlashda davom etadi.
6. Vercel'da Deploy tugmasini bosing. GitHub'ga yangi commit push qilinganda keyingi deploy avtomatik boshlanadi.

## Payme va Click
1. `.env.example` dagi to'lov sozlamalarini mavjud `.env` faylingizga ko'chirib, provayder bergan merchant ma'lumotlarini kiriting. Maxfiy kalitlarni chatga yoki repozitoriyga yubormang.
2. `PUBLIC_BASE_URL` ni production HTTPS domeningizga (oxirida `/` siz) sozlang.
3. Merchant kabinetlarida callback manzillarini ro'yxatdan o'tkazing:
   - Click Prepare/Complete: `https://your-domain.example/api/payment/click/callback`
   - Payme Merchant API: `https://your-domain.example/api/payment/payme/callback`
4. Serverni qayta ishga tushiring. Checkout faqat serverdagi sozlamalar to'liq bo'lganda provayderni "Ulangan" deb ko'rsatadi.

Buyurtma summasi serverdagi kurs narxidan hisoblanadi. Kursga kirish faqat Click Complete yoki Payme `PerformTransaction` imzosi/tasdig'i tekshirilganidan keyin beriladi. Provayderning callback URL'lari ommaviy HTTPS orqali kira olishi kerak; `localhost` production to'lov callbacklari uchun ishlamaydi.

## Yangi imkoniyatlar
- **Til**: navbardagi 🌐 tugmasi (UZ / RU / EN). Tarjima lug'ati: `frontend/public/js/i18n-dict.js`.
  Yangi matn qo'shsangiz, shu faylga `"o'zbekcha": ["ruscha", "inglizcha"]` ko'rinishida yozing.
- **Qora / Oq dizayn**: navbardagi tugma (admin panelda ham bor).
- **Kod maydoni** `/playground`: JS, Python, TypeScript, C, C++, Java, Go, Rust, PHP, Ruby, Bash
  (kompyuteringizda o'rnatilgani ishlaydi) + HTML/CSS jonli ko'rinish.
- **Tarjimon** `/translator`: uz ↔ ru ↔ en (MyMemory bepul API, internet kerak).
- Footer sahifalari: /faq /terms /privacy /refund /sitemap /careers /blog /press /affiliates.

## Xavfsizlik
Kod maydoni serverda kod ishga tushiradi. Faqat o'z kompyuteringizda ishlating.
Production'da (`NODE_ENV=production`) u o'chiq; yoqish uchun `.env` da `ENABLE_CODE_RUNNER=true`
(buni ochiq internetda qilmang, avval sandbox/Docker ichiga oling).
