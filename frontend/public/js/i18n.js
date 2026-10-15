/* ============================================================
   VELQI i18n — O'zbek / Русский / English
   Sahifadagi barcha matn (tugma, sarlavha, placeholder, toast, alert)
   lug'at (i18n-dict.js) orqali avtomatik tarjima qilinadi.
   Asl matn o'zbekcha; til almashganda qayta tarjima qilinadi.
   ============================================================ */
(function () {
  'use strict';

  const SUPPORTED = ['uz', 'ru', 'en'];
  const DICT = window.I18N_DICT || {};
  const IDX = { ru: 0, en: 1 };
  const ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'SVG', 'IFRAME']);

  const norm = (s) => s.replace(/[‘’ʻʼ`´]/g, "'").replace(/\s+/g, ' ').trim();

  // Sayt asosiy tili - o'zbekcha. Foydalanuvchi tanlagan til saqlanadi.
  function detectLang() {
    const saved = localStorage.getItem('lang');
    return SUPPORTED.includes(saved) ? saved : 'uz';
  }
  let lang = detectLang();

  // Dinamik matnlar (ism, narx, son qo'shilgan xabarlar)
  const RULES = [
    [/^Xush kelibsiz, (.+)!(.*)$/, ['Добро пожаловать, $1!$2', 'Welcome, $1!$2']],
    [/^"(.+)" savatingizga qo'shildi!$/, ['«$1» добавлен в вашу корзину!', '"$1" was added to your cart!']],
    [/^(.+) manzili ro'yxatga qo'shildi\. Tez orada yangiliklar olinadi\.$/, ['Адрес $1 добавлен в список. Скоро вы получите новости.', '$1 was subscribed. You will receive news soon.']],
    [/^"(.+)" darsini (.+) so'mga sotib olmoqchimisiz\?$/, ['Купить урок «$1» за $2 сум?', 'Buy the lesson "$1" for $2 UZS?']],
    [/^Bu (.+) allaqachon mavjud$/, ['Такое значение ($1) уже существует', 'This $1 already exists']],
    [/^(.+) manzili topilmadi$/, ['Адрес $1 не найден', '$1 was not found']],
    [/^(.+) — o'rnatilmagan$/, ['$1 — не установлен', '$1 — not installed']],
    [/^Foydalanuvchi faollashtirildi$/, ['Пользователь активирован', 'User activated']],
    [/^Foydalanuvchi nofaollashtirildi$/, ['Пользователь деактивирован', 'User deactivated']],
    [/^Qora dizayn faollashtirildi.*$/, ['Тёмная тема включена 🌙', 'Dark theme enabled 🌙']],
    [/^Oq dizayn faollashtirildi.*$/, ['Светлая тема включена ☀️', 'Light theme enabled ☀️']]
  ];
  // Raqam bilan kelgan birliklar
  const UNITS = [
    [/(\d[\d\s.,]*)\s*ta\s+dars\b/gi, ['$1 уроков', '$1 lessons']],
    [/(\d[\d\s.,]*)\s*ta\s+kurs\b/gi, ['$1 курсов', '$1 courses']],
    [/(\d[\d\s.,]*)\s*ta\s+o'quvchi\b/gi, ['$1 учеников', '$1 students']],
    [/(\d[\d\s.,]*)\s*ta\b/gi, ['$1', '$1']],
    [/\bso'm\b/gi, ['сум', 'UZS']],
    [/\bsoat\b/gi, ['час', 'hour']],
    [/\bdaqiqa\b/gi, ['мин', 'min']],
    [/\bdars(lar)?\b/gi, ['урок', 'lesson']],
    [/\bBepul\b/g, ['Бесплатно', 'Free']],
    [/\bbepul\b/g, ['бесплатно', 'free']]
  ];

  function lookup(text, to) {
    if (to === 'uz') return null;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    const core = norm(text);
    if (!core || !/[A-Za-zА-Яа-я]/.test(core)) return null;
    const i = IDX[to];
    let hit = DICT[core];
    if (hit) return lead + hit[i] + trail;
    for (const [re, tpl] of RULES) {
      if (re.test(core)) return lead + core.replace(re, tpl[i]) + trail;
    }
    // Sarlavha: "Kurslar | VELQI"
    const m = core.match(/^(.*) \| (VELQI.*)$/);
    if (m && DICT[m[1]]) return lead + DICT[m[1]][i] + ' | ' + m[2] + trail;
    // Faqat raqam + birlik bo'lsa
    if (/\d/.test(core)) {
      let out = core, changed = false;
      for (const [re, tpl] of UNITS) {
        const next = out.replace(re, tpl[i]);
        if (next !== out) { changed = true; out = next; }
      }
      if (changed) return lead + out + trail;
    }
    return null;
  }

  // Dastur tomonidan tarjima qilinadigan matn (toast, alert, JS)
  function t(msg) {
    if (typeof msg !== 'string' || lang === 'uz') return msg;
    const r = lookup(msg, lang);
    return r == null ? msg : r;
  }

  // ---------------- DOM tarjimasi ----------------
  const origText = new WeakMap();   // Text node -> asl (o'zbekcha) matn
  const appliedText = new WeakMap(); // Text node -> biz yozgan tarjima
  const origAttr = new WeakMap();   // Element -> {attr: {orig, applied}}
  let paused = false;

  function skip(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (SKIP_TAGS.has(n.tagName.toUpperCase())) return true;
      if (n.hasAttribute && (n.hasAttribute('data-no-i18n') || n.getAttribute('translate') === 'no' || n.isContentEditable)) return true;
    }
    return false;
  }

  function processText(node) {
    const parent = node.parentElement;
    if (!parent || skip(parent)) return;
    const current = node.data;
    // Dastur matnni o'zgartirgan bo'lsa -> yangi asl matn
    if (!origText.has(node) || (appliedText.has(node) && appliedText.get(node) !== current)) {
      origText.set(node, current);
      appliedText.delete(node);
    }
    const orig = origText.get(node);
    const out = lang === 'uz' ? orig : (lookup(orig, lang) ?? orig);
    if (out !== current) {
      node.data = out;
    }
    if (out !== orig) appliedText.set(node, out); else appliedText.delete(node);
  }

  function processAttrs(el) {
    if (!el.getAttribute || skip(el)) return;
    let rec = origAttr.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      rec = rec || {};
      let r = rec[a];
      if (!r || (r.applied != null && r.applied !== cur)) r = rec[a] = { orig: cur, applied: null };
      const out = lang === 'uz' ? r.orig : (lookup(r.orig, lang) ?? r.orig);
      if (out !== cur) el.setAttribute(a, out);
      r.applied = out !== r.orig ? out : null;
    }
    if (rec) origAttr.set(el, rec);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return processText(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (skip(root)) return; processAttrs(root); }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        if (n.nodeType === 1) return SKIP_TAGS.has(n.tagName.toUpperCase()) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) processText(n); else processAttrs(n);
    }
  }

  let titleOrig = null, titleApplied = null;
  function processTitle() {
    if (titleOrig == null || (titleApplied != null && titleApplied !== document.title)) { titleOrig = document.title; titleApplied = null; }
    const out = lang === 'uz' ? titleOrig : (lookup(titleOrig, lang) ?? titleOrig);
    if (out !== document.title) document.title = out;
    titleApplied = out !== titleOrig ? out : null;
  }

  function applyAll() {
    paused = true;
    document.documentElement.setAttribute('lang', lang);
    walk(document.body);
    processTitle();
    paused = false;
    updateSwitcher();
  }

  const observer = new MutationObserver((muts) => {
    if (paused) return;
    paused = true;
    try {
      for (const m of muts) {
        if (m.type === 'characterData') processText(m.target);
        else if (m.type === 'attributes') processAttrs(m.target);
        else m.addedNodes.forEach((n) => walk(n));
      }
      processTitle();
    } finally { paused = false; }
  });

  function setLang(next) {
    if (!SUPPORTED.includes(next)) return;
    lang = next;
    localStorage.setItem('lang', next);
    applyAll();
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: next } }));
  }

  // ---------------- Til tanlagich (navbar) ----------------
  function updateSwitcher() {
    document.querySelectorAll('[data-lang-current]').forEach((el) => { el.textContent = lang.toUpperCase(); });
    document.querySelectorAll('[data-set-lang]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-set-lang') === lang));
  }
  function initSwitcher() {
    document.querySelectorAll('.lang-switcher').forEach((box) => {
      const btn = box.querySelector('.lang-btn');
      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); box.classList.toggle('open'); });
    });
    document.querySelectorAll('[data-set-lang]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      setLang(b.getAttribute('data-set-lang'));
      document.querySelectorAll('.lang-switcher').forEach((x) => x.classList.remove('open'));
    }));
    document.addEventListener('click', () => document.querySelectorAll('.lang-switcher').forEach((x) => x.classList.remove('open')));
  }

  // ---------------- Toast / alert / confirm ----------------
  function patchGlobals() {
    try {
      if (typeof Toast !== 'undefined' && Toast.show && !Toast.__i18n) {
        const orig = Toast.show.bind(Toast);
        Toast.show = (message, type, duration) => orig(t(message), type, duration);
        Toast.__i18n = true;
      }
    } catch (_) { /* Toast yo'q sahifa */ }
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    window.alert = (m) => nativeAlert(t(String(m)));
    window.confirm = (m) => nativeConfirm(t(String(m)));
  }

  // Dastlabki tarjima ishga tushishidan oldin <html lang> ni o'rnatamiz (til bloklari uchun)
  document.documentElement.setAttribute('lang', lang);

  function boot() {
    patchGlobals();
    initSwitcher();
    applyAll();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.i18n = { t, setLang, getLang: () => lang, translateText: t };
  window.t = t;
})();
