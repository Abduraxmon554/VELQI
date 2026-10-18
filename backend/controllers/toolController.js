// Kod ishga tushirish (playground) va tarjima (translator) API
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const RUN_TIMEOUT_MS = 10000;
const MAX_OUTPUT = 64 * 1024;
const MAX_CODE = 64 * 1024;

// Barcha qo\x27llab-quvvatlanadigan dasturlash tillari
const LANGS = {
  javascript: { label: "JavaScript (Node.js)", file: "main.js", judge0Id: 102, bins: ["node"], run: (d, f) => [bin("node"), [f]] },
  python:     { label: "Python (3.x)",         file: "main.py", judge0Id: 100, bins: ["python3", "python"], run: (d, f) => [bin("python3", "python"), [f]] },
  typescript: { label: "TypeScript",           file: "main.ts", judge0Id: 101, bins: ["npx"], run: (d, f) => [bin("npx"), ["--yes", "tsx", f]], slow: true },
  c:          { label: "C (GCC)",              file: "main.c",  judge0Id: 103, bins: ["gcc", "cc"], compile: (d, f) => [bin("gcc", "cc"), [f, "-o", path.join(d, "a.out"), "-lm"]], run: (d) => [path.join(d, "a.out"), []] },
  cpp:        { label: "C++ (G++)",            file: "main.cpp", judge0Id: 105, bins: ["g++", "c++"], compile: (d, f) => [bin("g++", "c++"), [f, "-o", path.join(d, "a.out"), "-std=c++17"]], run: (d) => [path.join(d, "a.out"), []] },
  java:       { label: "Java (JDK)",           file: "Main.java", judge0Id: 91, bins: ["java"], run: (d, f) => [bin("java"), [f]] },
  go:         { label: "Go",                   file: "main.go", judge0Id: 107, bins: ["go"], run: (d, f) => [bin("go"), ["run", f]] },
  rust:       { label: "Rust",                 file: "main.rs", judge0Id: 108, bins: ["rustc"], compile: (d, f) => [bin("rustc"), [f, "-o", path.join(d, "a.out")]], run: (d) => [path.join(d, "a.out"), []] },
  php:        { label: "PHP",                  file: "main.php", judge0Id: 98, bins: ["php"], run: (d, f) => [bin("php"), [f]] },
  ruby:       { label: "Ruby",                 file: "main.rb", judge0Id: 72, bins: ["ruby"], run: (d, f) => [bin("ruby"), [f]] },
  csharp:     { label: "C# (.NET)",            file: "Program.cs", judge0Id: 51, bins: ["dotnet"], run: (d, f) => [bin("dotnet"), ["run", f]] },
  kotlin:     { label: "Kotlin",               file: "Main.kt", judge0Id: 111, bins: ["kotlinc"], run: (d, f) => [bin("kotlinc"), ["-script", f]] },
  swift:      { label: "Swift",                file: "main.swift", judge0Id: 83, bins: ["swift"], run: (d, f) => [bin("swift"), [f]] },
  bash:       { label: "Bash (terminal)",      file: "main.sh", judge0Id: 46, bins: ["bash"], run: (d, f) => [bin("bash"), [f]] }
};

const binCache = {};
function which(name) {
  if (name in binCache) return binCache[name];
  try {
    const r = spawnSync(process.platform === "win32" ? "where" : "which", [name], { encoding: "utf8" });
    binCache[name] = r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
  } catch (_) {
    binCache[name] = null;
  }
  return binCache[name];
}
function bin(...names) { for (const n of names) { const p = which(n); if (p) return p; } return names[0]; }
function available(lang) { return !!(LANGS[lang] && LANGS[lang].bins && LANGS[lang].bins.some(which)); }

function decodeB64(val) {
  if (!val) return "";
  try {
    return Buffer.from(val, "base64").toString("utf8");
  } catch (_) {
    return String(val);
  }
}

// Judge0 orqali bulutda xavfsiz va tezkor kod bajarish
async function runWithJudge0(langId, code, stdin = "", languageKey = "") {
  let source = code;
  if (languageKey === "java" && !source.includes("class Main")) {
    source = source.replace(/public\s+class\s+[A-Za-z0-9_]+/g, "public class Main");
  }

  const payload = {
    source_code: Buffer.from(source, "utf8").toString("base64"),
    language_id: langId,
    stdin: stdin ? Buffer.from(stdin, "utf8").toString("base64") : ""
  };

  const response = await fetch("https://ce.judge0.com/submissions?base64_encoded=true&wait=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`Judge0 xatosi: HTTP ${response.status}`);
  }

  const data = await response.json();
  const stdout = decodeB64(data.stdout);
  const stderr = decodeB64(data.stderr);
  const compileOut = decodeB64(data.compile_output);
  const message = decodeB64(data.message);
  const statusId = data.status?.id;

  let exitCode = 0;
  let stage = "run";
  let output = "";
  let timedOut = false;

  if (statusId === 3) {
    exitCode = 0;
    output = stdout;
  } else if (statusId === 6) {
    exitCode = 1;
    stage = "compile";
    output = compileOut || stderr || "Kompilyatsiya xatosi";
  } else if (statusId === 5) {
    exitCode = 124;
    timedOut = true;
    output = (stdout ? stdout + "\n" : "") + "[Vaqt chegarasidan oshdi]";
  } else {
    exitCode = data.exit_code != null ? data.exit_code : (statusId === 3 ? 0 : 1);
    output = (stderr || compileOut || stdout || message || data.status?.description || "Xatolik yuz berdi");
  }

  const executionTimeMs = data.time ? Math.round(parseFloat(data.time) * 1000) : 0;
  return {
    success: true,
    stage,
    exitCode,
    timedOut,
    output: output || "",
    ms: executionTimeMs
  };
}

function execProcess(cmd, args, opts, input) {
  return new Promise((resolve) => {
    let out = "", killed = false, truncated = false;
    let child;
    try {
      child = spawn(cmd, args, { ...opts, stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32" });
    } catch (e) { return resolve({ code: -1, out: e.message, timedOut: false }); }
    const timer = setTimeout(() => {
      killed = true;
      try { process.platform === "win32" ? child.kill() : process.kill(-child.pid, "SIGKILL"); } catch (_) {}
    }, opts.timeout || RUN_TIMEOUT_MS);
    const collect = (d) => {
      if (out.length < MAX_OUTPUT) out += d.toString();
      else if (!truncated) { truncated = true; out += "\n[...chiqish juda uzun, kesildi...]"; }
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (e) => { clearTimeout(timer); resolve({ code: -1, out: out + e.message, timedOut: false }); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code: code || 0, out, timedOut: killed }); });
    child.stdin.on("error", () => {});
    child.stdin.end(input || "");
  });
}

// Barcha tillar har doim faol (Judge0 orqali)
exports.languages = (req, res) => {
  const list = Object.entries(LANGS).map(([id, l]) => ({
    id,
    label: l.label,
    available: true
  }));
  res.json({ success: true, enabled: true, languages: list });
};

exports.run = async (req, res) => {
  const started = Date.now();
  try {
    const { language, code = "", stdin = "" } = req.body || {};
    const lang = LANGS[language];
    if (!lang) return res.status(400).json({ success: false, message: "Noma\x27lum dasturlash tili" });
    if (typeof code !== "string" || !code.trim()) return res.status(400).json({ success: false, message: "Kod bo\x27sh" });
    if (code.length > MAX_CODE) return res.status(400).json({ success: false, message: "Kod juda uzun (maks. 64 KB)" });

    // 1-bosqich: Judge0 orqali tezkor va xavfsiz ishga tushirish (Vercel va barcha serverlarda)
    if (lang.judge0Id) {
      try {
        const j0Result = await runWithJudge0(lang.judge0Id, code, stdin, language);
        if (!j0Result.ms) j0Result.ms = Date.now() - started;
        return res.json(j0Result);
      } catch (j0Err) {
        if (!available(language)) {
          return res.status(502).json({
            success: false,
            message: "Kod bajarish xizmati bilan aloqa bo\x27lmadi: " + j0Err.message
          });
        }
      }
    }

    // 2-bosqich: Lokal dasturlar yordamida zaxira ijro
    if (!available(language)) {
      return res.status(501).json({
        success: false,
        message: `${lang.label} kompyuterda o\x27rnatilmagan va bulut xizmati bilan aloqa yo\x27q`
      });
    }

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "edu-run-"));
    try {
      const file = path.join(dir, lang.file);
      fs.writeFileSync(file, code);
      const env = { PATH: process.env.PATH, HOME: dir, TMPDIR: dir, LANG: "C.UTF-8", npm_config_cache: path.join(os.tmpdir(), "edu-npm-cache") };
      const base = { cwd: dir, env, timeout: lang.slow ? 25000 : RUN_TIMEOUT_MS };

      let output = "";
      if (lang.compile) {
        const [c, a] = lang.compile(dir, file);
        const cr = await execProcess(c, a, { ...base, timeout: 20000 });
        if (cr.code !== 0) {
          return res.json({ success: true, stage: "compile", exitCode: cr.code, output: cr.out, timedOut: cr.timedOut, ms: Date.now() - started });
        }
        output += cr.out;
      }
      const [cmd, args] = lang.run(dir, file);
      const r = await execProcess(cmd, args, base, String(stdin).slice(0, 10000));
      res.json({
        success: true, stage: "run", exitCode: r.code, timedOut: r.timedOut,
        output: output + r.out + (r.timedOut ? `\n[Vaqt tugadi: ${base.timeout / 1000} soniyadan oshdi]` : ""),
        ms: Date.now() - started
      });
    } finally {
      fs.rm(dir, { recursive: true, force: true }, () => {});
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Kodni ishga tushirishda xato: " + err.message });
  }
};

// ---------- Tarjimon (MyMemory bepul API, kalit shart emas) ----------
const LANG_CODES = { uz: "uz-UZ", ru: "ru-RU", en: "en-GB" };

function chunkText(text, max = 450) {
  const parts = [];
  const sentences = text.match(/[^.!?\n]+[.!?]*\s*|\n/g) || [text];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max) { if (cur) parts.push(cur); cur = ""; }
    if (s.length > max) { for (let i = 0; i < s.length; i += max) parts.push(s.slice(i, i + max)); }
    else cur += s;
  }
  if (cur) parts.push(cur);
  return parts;
}

exports.translate = async (req, res) => {
  try {
    const { text, from, to } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ success: false, message: "Matn bo\x27sh" });
    if (text.length > 3000) return res.status(400).json({ success: false, message: "Matn juda uzun (maks. 3000 belgi)" });
    if (!LANG_CODES[from] || !LANG_CODES[to]) return res.status(400).json({ success: false, message: "Til noto\x27g\x27ri" });
    if (from === to) return res.json({ success: true, translation: text });

    const pieces = chunkText(text);
    const out = [];
    for (const p of pieces) {
      if (!p.trim()) { out.push(p); continue; }
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(p)}&langpair=${LANG_CODES[from]}|${LANG_CODES[to]}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error("Tarjima xizmati javob bermadi (" + r.status + ")");
      const data = await r.json();
      const t = data && data.responseData && data.responseData.translatedText;
      if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw new Error(t || "Tarjima xizmati xatosi");
      const lead = p.match(/^\s*/)[0], trail = p.match(/\s*$/)[0];
      out.push(lead + t.trim() + trail);
    }
    res.json({ success: true, translation: out.join("") });
  } catch (err) {
    res.status(502).json({ success: false, message: "Tarjima qilib bo\x27lmadi: " + err.message });
  }
};
