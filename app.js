'use strict';
(function () {
  var L = window.MathLogic;
  var I18N = window.MathI18n;
  var $ = function (id) { return document.getElementById(id); };
  var BEST_KEY = 'mathpractice_best';
  var HIST_KEY = 'mathpractice_history';
  var LANG_KEY = 'mathpractice_lang';

  var lang = 'en';
  try { lang = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { lang = 'en'; }
  if (lang !== 'en' && lang !== 'bn') { lang = 'en'; }

  var state = {
    mode: 'sprint', ops: ['+', '-', 'x', '/'], difficulty: 'easy',
    playing: false, current: null, score: 0, streak: 0, bestStreak: 0,
    answered: 0, correct: 0, perOp: {}, timeLeft: 60, timer: null
  };

  function t(key) { return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key; }
  function fmt(v) { return lang === 'bn' ? L.toBnDigits(String(v)) : String(v); }
  function bnToAscii(s) {
    var map = { '\u09e6': '0', '\u09e7': '1', '\u09e8': '2', '\u09e9': '3', '\u09ea': '4', '\u09eb': '5', '\u09ec': '6', '\u09ed': '7', '\u09ee': '8', '\u09ef': '9' };
    return String(s).replace(/[\u09e6-\u09ef]/g, function (d) { return map[d]; });
  }
  function loadJson(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function saveJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('title');
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) { els[i].textContent = t(els[i].getAttribute('data-i18n')); }
    var ph = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < ph.length; j++) { ph[j].placeholder = t(ph[j].getAttribute('data-i18n-placeholder')); }
    renderStats(); renderQuestion(); renderHistory(); renderSetupBest();
    if (!$('resultsPanel').hidden) { renderResultsFields(); }
  }

  function renderResultsFields() {
    var accuracy = state.answered ? Math.round(state.correct / state.answered * 100) : 0;
    $('resScore').textContent = fmt(state.score);
    $('resAnswered').textContent = fmt(state.answered);
    $('resCorrect').textContent = fmt(state.correct);
    $('resAccuracy').textContent = fmt(accuracy) + '%';
    $('resBestStreak').textContent = fmt(state.bestStreak);
    $('resGrade').textContent = t('resultsGrade') + ': ' + stateGrade(accuracy);
    var best = loadJson(BEST_KEY, {});
    $('resBest').textContent = fmt(best[state.mode] || 0);
    var bd = $('resBreakdown'); bd.innerHTML = '';
    L.OPS.forEach(function (op) {
      if (state.perOp[op]) {
        var li = document.createElement('li');
        li.textContent = L.OP_SYMBOL[op] + ' : ' + fmt(state.perOp[op].correct) + '/' + fmt(state.perOp[op].asked);
        bd.appendChild(li);
      }
    });
  }

  function renderSetupBest() {
    var best = loadJson(BEST_KEY, {});
    $('setupBest').textContent = best[state.mode] ? fmt(best[state.mode]) : '-';
  }
  function renderStats() {
    $('scoreEl').textContent = fmt(state.score);
    $('streakEl').textContent = fmt(state.streak);
    $('timerEl').textContent = fmt(state.timeLeft);
    $('progressEl').textContent = fmt(state.answered) + ' / ' + fmt(20);
  }
  function renderQuestion() {
    if (!state.current) { $('questionEl').textContent = '-'; return; }
    var txt = L.formatQ(state.current.a, state.current.b, state.current.op);
    $('questionEl').textContent = lang === 'bn' ? L.toBnDigits(txt) : txt;
  }
  function show(panel) {
    $('setupPanel').hidden = panel !== 'setup';
    $('gamePanel').hidden = panel !== 'game';
    $('resultsPanel').hidden = panel !== 'results';
  }
  function setFeedback(msg, cls) {
    var el = $('feedbackEl');
    el.textContent = msg; el.className = 'feedback ' + (cls || '');
  }

  function renderHistory() {
    var hist = loadJson(HIST_KEY, []);
    var list = $('historyList');
    list.innerHTML = '';
    $('historyEmpty').hidden = hist.length !== 0;
    hist.forEach(function (h) {
      var li = document.createElement('li');
      var modeName = h.mode === 'sprint' ? t('modeSprint') : t('modePractice');
      li.textContent = modeName + ' - ' + h.difficulty + ' - ' + t('score') + ' ' + fmt(h.score) + ', ' +
        fmt(h.correct) + '/' + fmt(h.total) + ' (' + fmt(h.accuracy) + '%)';
      list.appendChild(li);
    });
  }

  function nextQuestion() {
    var op = state.ops[Math.floor(Math.random() * state.ops.length)];
    state.current = L.makeQuestion(op, state.difficulty);
    $('answerInput').value = '';
    renderQuestion();
    $('answerInput').focus();
  }

  function recordAnswer(correct) {
    var op = state.current.op;
    if (!state.perOp[op]) { state.perOp[op] = { asked: 0, correct: 0 }; }
    state.perOp[op].asked++;
    state.answered++;
    if (correct) {
      state.perOp[op].correct++;
      state.correct++;
      state.streak++;
      if (state.streak > state.bestStreak) { state.bestStreak = state.streak; }
      state.score += L.scoreFor(state.streak);
    } else {
      state.streak = 0;
    }
    renderStats();
  }

  function finish() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    state.playing = false;
    var accuracy = state.answered ? Math.round(state.correct / state.answered * 100) : 0;
    var best = loadJson(BEST_KEY, {});
    if (!best[state.mode] || state.score > best[state.mode]) { best[state.mode] = state.score; saveJson(BEST_KEY, best); }
    renderResultsFields();
    var hist = loadJson(HIST_KEY, []);
    hist.unshift({ mode: state.mode, difficulty: state.difficulty, score: state.score, correct: state.correct, total: state.answered, accuracy: accuracy });
    saveJson(HIST_KEY, hist.slice(0, 20));
    renderHistory(); renderSetupBest();
    show('results');
  }
  function stateGrade(accuracy) {
    // gradeFor returns English labels; in bn mode keep the label text as-is
    // (grade names are shown beside the translated label).
    return L.gradeFor(accuracy);
  }

  function startGame() {
    var err = $('setupError');
    if (state.ops.length === 0) {
      err.textContent = t('errorSelectOp'); err.hidden = false; return;
    }
    err.hidden = true;
    state.score = 0; state.streak = 0; state.bestStreak = 0;
    state.answered = 0; state.correct = 0; state.perOp = {};
    state.playing = true; state.timeLeft = 60;
    $('timerWrap').hidden = state.mode !== 'sprint';
    $('progressWrap').hidden = state.mode !== 'practice';
    setFeedback('', '');
    show('game');
    renderStats();
    nextQuestion();
    if (state.mode === 'sprint') {
      state.timer = setInterval(function () {
        state.timeLeft--;
        renderStats();
        if (state.timeLeft <= 0) { setFeedback(t('feedbackTimeout'), 'bad'); finish(); }
      }, 1000);
    }
  }

  function submitAnswer() {
    if (!state.playing || !state.current) { return; }
    var raw = bnToAscii($('answerInput').value.trim());
    if (!/^-?[0-9]+$/.test(raw)) { setFeedback(t('errorEnterNumber'), 'bad'); return; }
    var given = parseInt(raw, 10);
    var correct = given === state.current.answer;
    recordAnswer(correct);
    if (correct) { setFeedback(t('feedbackCorrect'), 'ok'); }
    else { setFeedback(t('feedbackWrong') + ' ' + fmt(state.current.answer) + '.', 'bad'); }
    if (state.mode === 'practice' && state.answered >= 20) { finish(); return; }
    nextQuestion();
  }

  function skipQuestion() {
    if (!state.playing || !state.current) { return; }
    recordAnswer(false);
    setFeedback('', '');
    if (state.mode === 'practice' && state.answered >= 20) { finish(); return; }
    nextQuestion();
  }

  // Mode cards
  var modeCards = document.querySelectorAll('.mode-card');
  modeCards.forEach(function (card) {
    card.addEventListener('click', function () {
      state.mode = card.getAttribute('data-mode');
      modeCards.forEach(function (c) { c.classList.toggle('selected', c === card); });
      renderSetupBest();
    });
  });
  // Op toggles
  var opBtns = document.querySelectorAll('.op-btn');
  opBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var op = btn.getAttribute('data-op');
      var idx = state.ops.indexOf(op);
      if (idx >= 0) { state.ops.splice(idx, 1); } else { state.ops.push(op); }
      btn.classList.toggle('selected', idx < 0);
      $('setupError').hidden = true;
    });
  });
  $('difficultySelect').addEventListener('change', function (e) { state.difficulty = e.target.value; });
  $('startBtn').addEventListener('click', startGame);
  $('submitBtn').addEventListener('click', submitAnswer);
  $('skipBtn').addEventListener('click', skipQuestion);
  $('answerInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') { submitAnswer(); } });
  $('playAgainBtn').addEventListener('click', function () { show('setup'); renderSetupBest(); });
  $('langBtn').addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyLang();
  });
  $('clearInput').addEventListener('input', function (e) {
    $('clearBtn').disabled = e.target.value !== 'DELETE';
  });
  $('clearBtn').addEventListener('click', function () {
    saveJson(HIST_KEY, []);
    $('clearInput').value = ''; $('clearBtn').disabled = true;
    renderHistory();
  });

  applyLang();
})();
