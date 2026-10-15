(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const T = (s) => (window.i18n ? window.i18n.t(s) : s);
  const from = $('trFrom'), to = $('trTo'), input = $('trIn'), out = $('trOut'), status = $('trStatus'), count = $('trCount');
  let timer = null, seq = 0;

  function setOut(text, placeholder) { out.textContent = text; out.classList.toggle('placeholder', !!placeholder); }

  async function translate() {
    const text = input.value.trim();
    if (!text) { setOut('…', true); status.textContent = ''; return; }
    if (from.value === to.value) { setOut(text); return; }
    const my = ++seq;
    status.textContent = T('Tarjima qilinmoqda...');
    try {
      const r = await fetch('/api/tools/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, from: from.value, to: to.value })
      });
      const j = await r.json();
      if (my !== seq) return;
      if (!j.success) throw new Error(j.message);
      setOut(j.translation);
      status.textContent = '';
    } catch (e) {
      if (my !== seq) return;
      setOut('', true);
      status.textContent = '⚠ ' + e.message;
    }
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(translate, 700); };

  input.addEventListener('input', () => { count.textContent = input.value.length + ' / 3000'; later(); });
  from.addEventListener('change', translate);
  to.addEventListener('change', translate);
  $('trGo').addEventListener('click', translate);
  $('trClear').addEventListener('click', () => { input.value = ''; count.textContent = '0 / 3000'; setOut('…', true); status.textContent = ''; });
  $('trSwap').addEventListener('click', () => {
    const f = from.value; from.value = to.value; to.value = f;
    if (!out.classList.contains('placeholder') && out.textContent) input.value = out.textContent;
    count.textContent = input.value.length + ' / 3000';
    translate();
  });
  $('trCopy').addEventListener('click', async () => {
    if (out.classList.contains('placeholder')) return;
    try { await navigator.clipboard.writeText(out.textContent); window.Toast && Toast.success('Nusxa olindi!'); }
    catch (_) { window.Toast && Toast.error('Nusxa olishda xato'); }
  });

  // Sayt tili o'zgarganda tarjima yo'nalishini moslashtirish
  const lang = window.i18n ? window.i18n.getLang() : 'uz';
  if (lang === 'ru') { from.value = 'ru'; to.value = 'uz'; }
  else if (lang === 'en') { from.value = 'en'; to.value = 'uz'; }
})();
