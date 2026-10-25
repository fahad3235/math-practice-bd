// Math Practice BD - headless-Chrome smoke tests via raw CDP.
// Run: node tests/smoke.js   (spawns /opt/meta-chromium/chrome, file:// page)
'use strict';
const { spawn, execSync } = require('child_process');
const path = require('path');

const PORT = 9334;
const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html');

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('ok - ' + name); }
  else { failed++; console.log('FAIL - ' + name + (extra ? ' :: ' + extra : '')); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await res.json();
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('chrome debugger endpoint never came up');
}

// Parse "a + b = ?" / "a x b = ?" / "a / b = ?" from the DOM (ASCII digits in en mode).
function computeFromText(t) {
  const m = String(t).match(/(\d+)\s*([+\-x\/\u00d7\u00f7])\s*(\d+)/);
  if (!m) return null;
  const a = parseInt(m[1], 10), b = parseInt(m[3], 10), op = m[2];
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === 'x' || op === '\u00d7') return a * b;
  if (op === '/' || op === '\u00f7') return a / b;
  return null;
}

async function main() {
  const chrome = spawn('/opt/meta-chromium/chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--no-first-run', PAGE
  ], { stdio: 'ignore' });
  const errors = [];
  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let seq = 0;
    const pending = new Map();
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { resolve } = pending.get(data.id);
        pending.delete(data.id);
        resolve(data);
      }
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        errors.push('console.error: ' + JSON.stringify(data.params.args));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        errors.push('exception: ' + (data.params.exceptionDetails.exception.description || 'unknown'));
      }
    };
    function send(method, params) {
      return new Promise((resolve) => {
        const id = ++seq;
        pending.set(id, { resolve });
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    }
    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      if (res.error) return { error: JSON.stringify(res.error) };
      const inner = res.result ? res.result.result : undefined;
      if (!inner) return { error: 'no result: ' + JSON.stringify(res).slice(0, 200) };
      if (inner.subtype === 'error') return { error: inner.description };
      return { value: inner.value };
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(1200);

    let r = await evaluate('document.title');
    check('page title is Math Practice BD', r.value === 'Math Practice BD', JSON.stringify(r));
    r = await evaluate('document.querySelectorAll(".mode-card").length');
    check('2 mode cards present', r.value === 2, JSON.stringify(r));
    r = await evaluate('document.querySelectorAll(".op-btn").length');
    check('4 operation buttons present', r.value === 4, JSON.stringify(r));
    r = await evaluate('document.getElementById("difficultySelect") !== null && document.getElementById("startBtn") !== null');
    check('difficulty select + start button present', r.value === true);
    r = await evaluate('document.getElementById("historyEmpty") !== null && document.getElementById("historyEmpty").hidden === false');
    check('empty history state shown initially', r.value === true, JSON.stringify(r));

    // Start with no op selected -> inline error, game does not start
    await evaluate('document.querySelectorAll(".op-btn").forEach(b => b.click())');
    await sleep(200);
    await evaluate('document.getElementById("startBtn").click()');
    await sleep(200);
    r = await evaluate('document.getElementById("setupError").hidden === false && document.getElementById("setupError").textContent.length > 0');
    check('start with no op selected shows inline error', r.value === true, JSON.stringify(r));
    r = await evaluate('document.getElementById("gamePanel").hidden === true');
    check('game does not start when error shown', r.value === true);

    // Start Practice: re-select all ops, pick Practice, start
    await evaluate('document.querySelectorAll(".op-btn").forEach(b => b.click()); document.querySelector(\'[data-mode="practice"]\').click(); document.getElementById("startBtn").click()');
    await sleep(300);
    r = await evaluate('document.getElementById("gamePanel").hidden === false');
    check('Practice game panel shown after start', r.value === true);
    r = await evaluate('document.getElementById("questionEl").textContent');
    check('a question is shown', /\d+\s*[+\-x\/\u00d7\u00f7]\s*\d+/.test(r.value || ''), JSON.stringify(r));

    // Answer 3 correctly via DOM parsing
    let scoreOk = true, streakOk = true;
    for (let i = 0; i < 3; i++) {
      r = await evaluate('document.getElementById("questionEl").textContent');
      const ans = computeFromText(r.value);
      if (ans === null) { scoreOk = false; break; }
      await evaluate('document.getElementById("answerInput").value = "' + ans + '"; document.getElementById("submitBtn").click()');
      await sleep(200);
    }
    r = await evaluate('document.getElementById("scoreEl").textContent');
    // streak 1->10, 2->10, 3->15 = 35
    check('3 correct answers raise score to 35', r.value === '35', JSON.stringify(r));
    r = await evaluate('document.getElementById("streakEl").textContent');
    check('streak is 3 after 3 correct', r.value === '3', JSON.stringify(r));

    // Empty answer -> inline error, no crash
    await evaluate('document.getElementById("answerInput").value = ""; document.getElementById("submitBtn").click()');
    await sleep(200);
    r = await evaluate('document.getElementById("feedbackEl").textContent');
    check('empty answer shows inline error', r.value.length > 0, JSON.stringify(r));
    // Non-numeric answer -> inline error
    await evaluate('document.getElementById("answerInput").value = "abc"; document.getElementById("submitBtn").click()');
    await sleep(200);
    r = await evaluate('document.getElementById("feedbackEl").textContent');
    check('non-numeric answer shows inline error', r.value.length > 0, JSON.stringify(r));

    // One wrong answer resets streak to 0
    r = await evaluate('document.getElementById("questionEl").textContent');
    const correctAns = computeFromText(r.value);
    await evaluate('document.getElementById("answerInput").value = "' + (correctAns + 1) + '"; document.getElementById("submitBtn").click()');
    await sleep(200);
    r = await evaluate('document.getElementById("streakEl").textContent');
    check('wrong answer resets streak to 0', r.value === '0', JSON.stringify(r));
    r = await evaluate('document.getElementById("feedbackEl").textContent');
    check('wrong feedback shows correct answer', String(r.value).indexOf(String(correctAns)) >= 0, JSON.stringify(r));

    // Skip advances progress
    r = await evaluate('document.getElementById("progressEl").textContent');
    const progBefore = r.value;
    await evaluate('document.getElementById("skipBtn").click()');
    await sleep(200);
    r = await evaluate('document.getElementById("progressEl").textContent');
    check('Skip advances progress', r.value !== progBefore, progBefore + ' -> ' + JSON.stringify(r));

    // Complete all 20 Practice questions correctly via a fresh game (reload resets state)
    await send('Page.reload');
    await sleep(1500);
    await evaluate('document.querySelector(\'[data-mode="practice"]\').click(); document.getElementById("startBtn").click()');
    await sleep(300);
    let completed = false;
    for (let i = 0; i < 20; i++) {
      r = await evaluate('document.getElementById("questionEl").textContent');
      const ans = computeFromText(r.value);
      if (ans === null) break;
      await evaluate('document.getElementById("answerInput").value = "' + ans + '"; document.getElementById("submitBtn").click()');
      await sleep(150);
      if (i === 19) {
        const vis = await evaluate('document.getElementById("resultsPanel").hidden === false');
        completed = vis.value === true;
      }
    }
    check('completing 20 Practice questions shows results', completed === true);
    r = await evaluate('document.getElementById("resAccuracy").textContent');
    check('100% accuracy path shows 100%', r.value === '100%', JSON.stringify(r));
    r = await evaluate('document.getElementById("resAnswered").textContent');
    check('results show 20 answered', r.value === '20', JSON.stringify(r));
    r = await evaluate('document.getElementById("resBreakdown").children.length');
    check('per-operation breakdown rendered', r.value >= 1, JSON.stringify(r));

    // Language toggle -> Bangla title + Bengali digits in results score
    await evaluate('document.getElementById("langBtn").click()');
    await sleep(300);
    r = await evaluate('document.querySelector("h1").textContent');
    check('lang toggle switches title to Bangla', /[\u09e6-\u09ef\u0985-\u09b9]/.test(r.value || ''), JSON.stringify(r));
    r = await evaluate('document.getElementById("resScore").textContent');
    check('Bengali digits shown in bn mode', /[\u09e6-\u09ef]/.test(r.value || ''), JSON.stringify(r));

    // Best score persists after reload (localStorage)
    r = await evaluate('localStorage.getItem("mathpractice_best")');
    check('best score persisted in localStorage', r.value && r.value.indexOf('practice') >= 0, JSON.stringify(r));
    await send('Page.reload');
    await sleep(1200);
    r = await evaluate('localStorage.getItem("mathpractice_best")');
    check('best score survives reload', r.value && r.value.indexOf('practice') >= 0, JSON.stringify(r));

    // 390px mobile: no horizontal overflow
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(400);
    r = await evaluate('document.documentElement.scrollWidth');
    check('390px viewport has no horizontal overflow', r.value <= 390, 'scrollWidth=' + r.value);

    check('zero console errors / page exceptions during smoke run', errors.length === 0, errors.join(' | '));
    ws.close();
  } finally {
    try { execSync('pkill -x chrome 2>/dev/null || true'); } catch (e) {}
    try { chrome.kill('SIGKILL'); } catch (e) {}
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SMOKE HARNESS ERROR: ' + e.message); process.exit(2); });
