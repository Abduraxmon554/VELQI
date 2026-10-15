// Kod ishga tushirish (playground) va tarjima (translator) API
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RUN_TIMEOUT_MS = 8000;
const MAX_OUTPUT = 64 * 1024;
const MAX_CODE = 50 * 1024;

// Qaysi til qaysi dasturda ishlaydi. Kompyuteringizda o'rnatilgani avtomatik aniqlanadi.
const LANGS = {
  javascript: { label: 'JavaScript (Node.js)', file: 'main.js', bins: ['node'], run: (d, f) => [bin('node'), [f]] },
  python:     { label: 'Python',      file: 'main.py',  bins: ['python3', 'python'], run: (d, f) => [bin('python3', 'python'), [f]] },
  typescript: { label: 'TypeScript',  file: 'main.ts',  bins: ['npx'], run: (d, f) => [bin('npx'), ['--yes', 'tsx', f]], slow: true },
  c:          { label: 'C',           file: 'main.c',   bins: ['gcc', 'cc'], compile: (d, f) => [bin('gcc', 'cc'), [f, '-o', path.join(d, 'a.out'), '-lm']], run: (d) => [path.join(d, 'a.out'), []] },
  cpp:        { label: 'C++',         file: 'main.cpp', bins: ['g++', 'c++'], compile: (d, f) => [bin('g++', 'c++'), [f, '-o', path.join(d, 'a.out'), '-std=c++17']], run: (d) => [path.join(d, 'a.out'), []] },
  java:       { label: 'Java',        file: 'Main.java', bins: ['java'], run: (d, f) => [bin('java'), [f]] },
  go:         { label: 'Go',          file: 'main.go',  bins: ['go'], run: (d, f) => [bin('go'), ['run', f]] },
  rust:       { label: 'Rust',        file: 'main.rs',  bins: ['rustc'], compile: (d, f) => [bin('rustc'), [f, '-o', path.join(d, 'a.out')]], run: (d) => [path.join(d, 'a.out'), []] },
  php:        { label: 'PHP',         file: 'main.php', bins: ['php'], run: (d, f) => [bin('php'), [f]] },
  ruby:       { label: 'Ruby',        file: 'main.rb',  bins: ['ruby'], run: (d, f) => [bin('ruby'), [f]] },
  bash:       { label: 'Bash (terminal)', file: 'main.sh', bins: ['bash'], run: (d, f) => [bin('bash'), [f]], dangerous: true },
};

const binCache = {};
function which(name) {
  if (name in binCache) return binCache[name];
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  binCache[name] = r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
  return binCache[name];
}
function bin(...names) { for (const n of names) { const p = which(n); if (p) return p; } return names[0]; }
function available(lang) { return LANGS[lang].bins.some(which); }

// Production'da kod ishga tushirish sukut bo'yicha o'chiq (xavfsizlik). ENABLE_CODE_RUNNER=true bilan yoqiladi.
function runnerEnabled() {
  if (process.env.ENABLE_CODE_RUNNER === 'true') return true;
  if (process.env.ENABLE_CODE_RUNNER === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
// Bash faqat aniq yoqilganda ishlaydi
function bashEnabled() { return process.env.ENABLE_BASH_RUNNER === 'true' || (process.env.NODE_ENV !== 'production' && process.env.ENABLE_BASH_RUNNER !== 'false'); }

exports.languages = (req, res) => {
  const enabled = runnerEnabled();
  const list = Object.entries(LANGS).map(([id, l]) => ({
    id, label: l.label,
    available: enabled && available(id) && (!l.dangerous || bashEnabled())
  }));
  res.json({ success: true, enabled, languages: list });
};

function execProcess(cmd, args, opts, input) {
  return new Promise((resolve) => {
    let out = '', killed = false, truncated = false;
    let child;
    try {
      child = spawn(cmd, args, { ...opts, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    } catch (e) { return resolve({ code: -1, out: e.message, timedOut: false }); }
    const timer = setTimeout(() => {
      killed = true;
      try { process.platform === 'win32' ? child.kill() : process.kill(-child.pid, 'SIGKILL'); } catch (_) {}
    }, opts.timeout || RUN_TIMEOUT_MS);
    const collect = (d) => {
      if (out.length < MAX_OUTPUT) out += d.toString();
      else if (!truncated) { truncated = true; out += '\n[...chiqish juda uzun, kesildi...]'; }
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out: out + e.message, timedOut: false }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out, timedOut: killed }); });
    child.stdin.on('error', () => {});
    child.stdin.end(input || '');
  });
}

exports.run = async (req, res) => {
  try {
    if (!runnerEnabled()) {
      return res.status(403).json({ success: false, message: 'Kod ishga tushirish serverda o\'chirilgan (ENABLE_CODE_RUNNER=true qiling).' });
    }
    const { language, code = '', stdin = '' } = req.body || {};
    const lang = LANGS[language];
    if (!lang) return res.status(400).json({ success: false, message: 'Noma\'lum dasturlash tili' });
    if (typeof code !== 'string' || !code.trim()) return res.status(400).json({ success: false, message: 'Kod bo\'sh' });
    if (code.length > MAX_CODE) return res.status(400).json({ success: false, message: 'Kod juda uzun (maks. 50 KB)' });
    if (lang.dangerous && !bashEnabled()) return res.status(403).json({ success: false, message: 'Bash terminali o\'chirilgan' });
    if (!available(language)) {
      return res.status(501).json({ success: false, message: `${lang.label} kompyuteringizda o'rnatilmagan (${lang.bins.join(' / ')} topilmadi)` });
    }

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-run-'));
    const started = Date.now();
    try {
      const file = path.join(dir, lang.file);
      fs.writeFileSync(file, code);
      const env = { PATH: process.env.PATH, HOME: dir, TMPDIR: dir, LANG: 'C.UTF-8', npm_config_cache: path.join(os.tmpdir(), 'edu-npm-cache') };
      const base = { cwd: dir, env, timeout: lang.slow ? 30000 : RUN_TIMEOUT_MS };

      let output = '';
      if (lang.compile) {
        const [c, a] = lang.compile(dir, file);
        const cr = await execProcess(c, a, { ...base, timeout: 20000 });
        if (cr.code !== 0) {
          return res.json({ success: true, stage: 'compile', exitCode: cr.code, output: cr.out, timedOut: cr.timedOut, ms: Date.now() - started });
        }
        output += cr.out;
      }
      const [cmd, args] = lang.run(dir, file);
      const r = await execProcess(cmd, args, base, String(stdin).slice(0, 10000));
      res.json({
        success: true, stage: 'run', exitCode: r.code, timedOut: r.timedOut,
        output: output + r.out + (r.timedOut ? `\n[Vaqt tugadi: ${base.timeout / 1000} soniyadan oshdi]` : ''),
        ms: Date.now() - started
      });
    } finally {
      fs.rm(dir, { recursive: true, force: true }, () => {});
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Kodni ishga tushirishda xato: ' + err.message });
  }
};

// ---------- Tarjimon (MyMemory bepul API, kalit shart emas) ----------
const LANG_CODES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' };

function chunkText(text, max = 450) {
  const parts = [];
  const sentences = text.match(/[^.!?\n]+[.!?]*\s*|\n/g) || [text];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max) { if (cur) parts.push(cur); cur = ''; }
    if (s.length > max) { for (let i = 0; i < s.length; i += max) parts.push(s.slice(i, i + max)); }
    else cur += s;
  }
  if (cur) parts.push(cur);
  return parts;
}

exports.translate = async (req, res) => {
  try {
    const { text, from, to } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) return res.status(400).json({ success: false, message: 'Matn bo\'sh' });
    if (text.length > 3000) return res.status(400).json({ success: false, message: 'Matn juda uzun (maks. 3000 belgi)' });
    if (!LANG_CODES[from] || !LANG_CODES[to]) return res.status(400).json({ success: false, message: 'Til noto\'g\'ri' });
    if (from === to) return res.json({ success: true, translation: text });

    const pieces = chunkText(text);
    const out = [];
    for (const p of pieces) {
      if (!p.trim()) { out.push(p); continue; }
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(p)}&langpair=${LANG_CODES[from]}|${LANG_CODES[to]}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error('Tarjima xizmati javob bermadi (' + r.status + ')');
      const data = await r.json();
      const t = data && data.responseData && data.responseData.translatedText;
      if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw new Error(t || 'Tarjima xizmati xatosi');
      const lead = p.match(/^\s*/)[0], trail = p.match(/\s*$/)[0];
      out.push(lead + t.trim() + trail);
    }
    res.json({ success: true, translation: out.join('') });
  } catch (err) {
    res.status(502).json({ success: false, message: 'Tarjima qilib bo\'lmadi: ' + err.message });
  }
};
