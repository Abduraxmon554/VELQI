/* Kod maydoni: serverda haqiqiy ishga tushirish (/api/tools/run) + HTML jonli ko'rinish */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const T = (s) => (window.i18n ? window.i18n.t(s) : s);

  const EX = {
    javascript: {
      file: 'main.js',
      examples: [
        ['Salom, dunyo!', 'console.log("Salom, dunyo!");\nconsole.log("2 + 3 =", 2 + 3);'],
        ['Fibonacci', 'function fib(n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }\nfor (let i = 0; i < 10; i++) console.log(`fib(${i}) = ${fib(i)}`);'],
        ['Massiv va map/filter', 'const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];\nconst squares = nums.filter(n => n % 2 === 0).map(n => n ** 2);\nconsole.log("Juft sonlar kvadrati:", squares);']
      ]
    },
    python: {
      file: 'main.py',
      examples: [
        ['Salom, dunyo!', 'print("Salom, dunyo!")\nname = "Dasturchi"\nprint(f"Xush kelibsiz, {name}!")'],
        ['Neyron (AI asoslari)', 'import math\n\ndef sigmoid(x):\n    return 1 / (1 + math.exp(-x))\n\ninputs = [0.5, 1.2, -0.3]\nweights = [0.8, -0.4, 1.1]\nbias = 0.1\ns = sum(i * w for i, w in zip(inputs, weights)) + bias\nprint("Kirish signallari yig\'indisi:", round(s, 4))\nprint("Aktivatsiya:", round(sigmoid(s), 4))'],
        ['stdin bilan (input)', 'a = int(input())\nb = int(input())\nprint("Yig\'indi:", a + b)', '12\n30']
      ]
    },
    typescript: {
      file: 'main.ts',
      examples: [['Salom, TypeScript', 'const greet = (name: string): string => `Salom, ${name}!`;\nconsole.log(greet("Dunyo"));']]
    },
    c: {
      file: 'main.c',
      examples: [
        ['Salom, dunyo!', '#include <stdio.h>\n\nint main(void) {\n    printf("Salom, dunyo!\\n");\n    return 0;\n}'],
        ['Faktorial (stdin)', '#include <stdio.h>\n\nint main(void) {\n    int n; unsigned long long f = 1;\n    scanf("%d", &n);\n    for (int i = 2; i <= n; i++) f *= i;\n    printf("%d! = %llu\\n", n, f);\n    return 0;\n}', '10']
      ]
    },
    cpp: {
      file: 'main.cpp',
      examples: [
        ['Salom, dunyo!', '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Salom, dunyo!" << endl;\n    return 0;\n}'],
        ['Vector saralash', '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    vector<int> v = {5, 2, 9, 1, 7};\n    sort(v.begin(), v.end());\n    for (int x : v) cout << x << " ";\n    cout << endl;\n}']
      ]
    },
    java: {
      file: 'Main.java',
      examples: [['Salom, dunyo!', 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Salom, dunyo!");\n        for (int i = 1; i <= 3; i++) System.out.println("Qadam " + i);\n    }\n}']]
    },
    go: {
      file: 'main.go',
      examples: [['Salom, dunyo!', 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Salom, dunyo!")\n}']]
    },
    rust: {
      file: 'main.rs',
      examples: [['Salom, dunyo!', 'fn main() {\n    println!("Salom, dunyo!");\n}']]
    },
    php: {
      file: 'main.php',
      examples: [['Salom, dunyo!', '<?php\necho "Salom, dunyo!\\n";\n$a = [3, 1, 2];\nsort($a);\nprint_r($a);']]
    },
    ruby: {
      file: 'main.rb',
      examples: [['Salom, dunyo!', 'puts "Salom, dunyo!"\n3.times { |i| puts "Qadam #{i + 1}" }']]
    },
    bash: {
      file: 'main.sh',
      examples: [
        ['Terminal asoslari', '#!/bin/bash\necho "Foydalanuvchi: $(whoami)"\necho "Sana: $(date)"\necho "Joriy papka:"; pwd\necho "Fayllar:"; ls -la'],
        ['Tarmoq tekshiruvi (xavfsiz)', '#!/bin/bash\n# Faqat o\'z kompyuteringizda mashq qiling!\necho "Hostname: $(hostname)"\nuname -a\necho "Ochiq portlar uchun: ss -tuln"\nss -tuln 2>/dev/null | head -10']
      ]
    },
    html: {
      file: 'index.html', live: true, label: 'HTML / CSS / JS (jonli ko\'rinish)',
      examples: [
        ['Chiroyli karta', '<style>\n  body { font-family: sans-serif; display: grid; place-items: center; height: 100vh; margin: 0; background: #0f172a; }\n  .card { padding: 28px 36px; border-radius: 18px; color: #fff; background: linear-gradient(135deg,#667eea,#764ba2); text-align: center; }\n  button { margin-top: 12px; padding: 8px 18px; border: 0; border-radius: 10px; cursor: pointer; }\n</style>\n<div class="card">\n  <h2>Salom, VELQI!</h2>\n  <p id="n">0 marta bosildi</p>\n  <button onclick="c++; n.textContent = c + \' marta bosildi\'">Bos</button>\n</div>\n<script>let c = 0;<\/script>']
      ]
    }
  };
  const LABELS = { html: "HTML / CSS / JS (jonli ko'rinish)" };

  const el = { lang: $('pgLang'), ex: $('pgExample'), code: $('pgCode'), stdin: $('pgStdin'), out: $('pgOut'), run: $('pgRun'),
               reset: $('pgReset'), clear: $('pgClear'), file: $('pgFile'), status: $('pgStatus'), preview: $('pgPreview'),
               task: $('pgTask'), notice: $('pgNotice') };
  let current = localStorage.getItem('pg_lang') || 'javascript';
  let serverLangs = {};   // id -> {label, available}
  let runnerEnabled = true;
  let running = false;

  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const storeKey = (l, i) => `pg_code_${l}_${i}`;

  function fillLangSelect() {
    const opts = [];
    Object.keys(EX).forEach((id) => {
      const info = serverLangs[id];
      const isLive = !!EX[id].live;
      const label = isLive ? LABELS[id] : (info ? info.label : id);
      const ok = isLive || (info && info.available);
      opts.push(`<option value="${id}" ${ok ? '' : 'disabled'}>${esc(label)}${ok ? '' : ' — o\'rnatilmagan'}</option>`);
    });
    el.lang.innerHTML = opts.join('');
    if (el.lang.querySelector(`option[value="${current}"]:not([disabled])`) == null) {
      const first = el.lang.querySelector('option:not([disabled])');
      current = first ? first.value : 'html';
    }
    el.lang.value = current;
  }

  function loadExamples(keepIndex) {
    const data = EX[current];
    el.ex.innerHTML = data.examples.map((e, i) => `<option value="${i}">${esc(e[0])}</option>`).join('');
    if (keepIndex != null) el.ex.value = String(keepIndex);
    loadCode();
  }

  function loadCode() {
    const data = EX[current];
    const i = Number(el.ex.value || 0);
    const ex = data.examples[i];
    const saved = localStorage.getItem(storeKey(current, i));
    el.code.value = saved != null ? saved : ex[1];
    el.stdin.value = ex[2] || '';
    el.file.textContent = data.file;
    el.task.textContent = data.live ? T('HTML yoki CSS yozing — natija o\'ng tomonda darhol yangilanadi.') : T('Kodni tahrirlang va "Kodni Ishga Tushirish" tugmasini bosing. Natija terminalda chiqadi.');
    el.stdin.style.display = data.live ? 'none' : '';
    el.out.style.display = data.live ? 'none' : '';
    el.preview.style.display = data.live ? 'block' : 'none';
    if (data.live) renderPreview();
  }

  function renderPreview() { el.preview.srcdoc = el.code.value; }

  function print(html) { el.out.innerHTML += html; el.out.scrollTop = el.out.scrollHeight; }

  async function run() {
    const data = EX[current];
    if (data.live) { renderPreview(); window.Toast && Toast.success('HTML/CSS ko\'rinishi yangilandi!'); return; }
    if (running) return;
    if (!runnerEnabled) { window.Toast && Toast.error('Kod ishga tushirish serverda o\'chirilgan'); return; }
    running = true;
    el.run.disabled = true;
    el.status.textContent = '⏳';
    el.out.innerHTML = `<span class="ok">$ run ${esc(data.file)}</span>\n`;
    try {
      const res = await fetch('/api/tools/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: current, code: el.code.value, stdin: el.stdin.value })
      });
      const j = await res.json();
      if (!j.success) { print(`<span class="err">${esc(j.message || 'Xato')}</span>\n`); window.Toast && Toast.error(j.message || 'Xato'); return; }
      const out = j.output || '';
      print(out ? (j.exitCode === 0 ? esc(out) : `<span class="err">${esc(out)}</span>`) : '<span class="dim">[Natija bo\'sh]</span>');
      print(`\n\n<span class="dim">${j.stage === 'compile' ? 'Kompilyatsiya xatosi · ' : ''}${j.timedOut ? 'timeout' : 'exit code ' + j.exitCode} · ${j.ms} ms</span>`);
      el.status.textContent = j.exitCode === 0 ? '✅' : '❌';
      if (window.Toast) (j.exitCode === 0 ? Toast.success('Kod muvaffaqiyatli bajarildi!') : Toast.error('Kodingizda xatolik yuz berdi'));
    } catch (e) {
      print(`<span class="err">Server bilan aloqa yo'q: ${esc(e.message)}</span>\n`);
    } finally {
      running = false; el.run.disabled = false;
      if (el.status.textContent === '⏳') el.status.textContent = '';
    }
  }

  // --- hodisalar ---
  el.lang.addEventListener('change', () => { current = el.lang.value; localStorage.setItem('pg_lang', current); loadExamples(0); });
  el.ex.addEventListener('change', loadCode);
  el.run.addEventListener('click', run);
  el.reset.addEventListener('click', () => {
    localStorage.removeItem(storeKey(current, Number(el.ex.value || 0)));
    loadCode();
    window.Toast && Toast.info('Boshlang\'ich kod tiklandi');
  });
  el.clear.addEventListener('click', () => { el.out.innerHTML = ''; el.status.textContent = ''; });
  el.code.addEventListener('input', () => {
    localStorage.setItem(storeKey(current, Number(el.ex.value || 0)), el.code.value);
    if (EX[current].live) { clearTimeout(el._t); el._t = setTimeout(renderPreview, 350); }
  });
  el.code.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = el.code.selectionStart, en = el.code.selectionEnd;
      el.code.setRangeText('    ', s, en, 'end');
      el.code.dispatchEvent(new Event('input'));
    }
  });

  // --- boshlash ---
  fetch('/api/tools/languages').then((r) => r.json()).then((j) => {
    runnerEnabled = j.enabled !== false;
    (j.languages || []).forEach((l) => { serverLangs[l.id] = l; });
    if (!runnerEnabled) {
      el.notice.style.display = 'block';
      el.notice.textContent = "Kod ishga tushirish serverda o'chirilgan (production). Yoqish uchun .env ga ENABLE_CODE_RUNNER=true qo'shing. Hozircha faqat HTML/CSS jonli ko'rinishi ishlaydi.";
    }
  }).catch(() => {}).finally(() => { fillLangSelect(); loadExamples(0); });
})();
