'use strict';
const assert = require('assert');
const L = require('../logic.js');
const I18N = require('../i18n.js');

let n = 0;
function ok(name, cond) { n++; assert.ok(cond, name); console.log('ok - ' + name); }

// Seeded rng (mulberry32)
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function expected(op, a, b) {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === 'x') return a * b;
  return a / b;
}

for (const diff of L.DIFFICULTY) {
  for (const op of L.OPS) {
    const rng = seeded(42 + diff.length * 10 + op.charCodeAt(0));
    for (let i = 0; i < 200; i++) {
      const q = L.makeQuestion(op, diff, rng);
      assert.strictEqual(q.answer, expected(op, q.a, q.b), 'answer math ' + op + '/' + diff);
      if (op === '-') assert.ok(q.a - q.b >= 0, 'subtraction non-negative');
      if (op === '/') assert.ok(Number.isInteger(q.a / q.b), 'division exact');
      if (diff === 'easy') {
        if (op === '+') { assert.ok(q.a >= 0 && q.a <= 20 && q.a + q.b <= 20, 'easy add range'); }
        if (op === '-') { assert.ok(q.a <= 20 && q.b <= q.a, 'easy sub range'); }
        if (op === 'x') { assert.ok(q.a >= 2 && q.a <= 5 && q.b >= 1 && q.b <= 9, 'easy mul range'); }
        if (op === '/') { assert.ok(q.b >= 2 && q.b <= 5 && q.answer >= 1 && q.answer <= 9, 'easy div range'); }
      }
      if (diff === 'medium') {
        if (op === '+') { assert.ok(q.a >= 10 && q.a <= 99 && q.b >= 10 && q.a + q.b <= 199, 'medium add range'); }
        if (op === '-') { assert.ok(q.a >= 10 && q.a <= 99 && q.b >= 10 && q.b <= q.a, 'medium sub range'); }
        if (op === 'x') { assert.ok(q.a >= 2 && q.a <= 9 && q.b >= 2 && q.b <= 9, 'medium mul range'); }
        if (op === '/') { assert.ok(q.b >= 2 && q.b <= 12 && q.answer >= 2 && q.answer <= 12, 'medium div range'); }
      }
      if (diff === 'hard') {
        if (op === '+') { assert.ok(q.a >= 100 && q.a <= 999 && q.b >= 100 && q.b <= 999, 'hard add range'); }
        if (op === '-') { assert.ok(q.a >= 100 && q.a <= 999 && q.b >= 100 && q.b <= q.a, 'hard sub range'); }
        if (op === 'x') { assert.ok(q.a >= 12 && q.a <= 99 && q.b >= 2 && q.b <= 9, 'hard mul range'); }
        if (op === '/') { assert.ok(q.b >= 2 && q.b <= 19 && q.answer >= 12 && q.answer <= 99, 'hard div range'); }
      }
    }
    n++;
    console.log('ok - 200 seeded samples invariant ' + op + '/' + diff);
  }
}

ok('randInt stays in range', (() => { const r = seeded(7); for (let i = 0; i < 500; i++) { const v = L.randInt(5, 9, r); if (v < 5 || v > 9) return false; } return true; })());
ok('scoreFor 0 -> 10', L.scoreFor(0) === 10);
ok('scoreFor 2 -> 10', L.scoreFor(2) === 10);
ok('scoreFor 3 -> 15', L.scoreFor(3) === 15);
ok('scoreFor 10 -> 15', L.scoreFor(10) === 15);
ok('gradeFor 100 -> Excellent', L.gradeFor(100) === 'Excellent');
ok('gradeFor 90 -> Excellent', L.gradeFor(90) === 'Excellent');
ok('gradeFor 89 -> Good', L.gradeFor(89) === 'Good');
ok('gradeFor 70 -> Good', L.gradeFor(70) === 'Good');
ok('gradeFor 69 -> Fair', L.gradeFor(69) === 'Fair');
ok('gradeFor 50 -> Fair', L.gradeFor(50) === 'Fair');
ok('gradeFor 49 -> Keep Practicing', L.gradeFor(49) === 'Keep Practicing');
ok('gradeFor 0 -> Keep Practicing', L.gradeFor(0) === 'Keep Practicing');
ok('toBnDigits 0123456789', L.toBnDigits('0123456789') === '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef');
ok('toBnDigits leaves non-digits', L.toBnDigits('Score 42') === 'Score \u09ea\u09e8');
ok('formatQ add', L.formatQ(7, 5, '+') === '7 + 5 = ?');
ok('formatQ mul uses x symbol', L.formatQ(3, 4, 'x') === '3 \u00d7 4 = ?');
ok('formatQ div uses division symbol', L.formatQ(12, 3, '/') === '12 \u00f7 3 = ?');
ok('makeQuestion returns text matching a/b/op', (() => { const q = L.makeQuestion('+', 'easy', seeded(1)); return q.text === L.formatQ(q.a, q.b, q.op); })());
ok('unknown op throws', (() => { try { L.makeQuestion('^', 'easy'); return false; } catch (e) { return true; } })());
ok('unknown difficulty throws', (() => { try { L.makeQuestion('+', 'insane'); return false; } catch (e) { return true; } })());

const enKeys = Object.keys(I18N.en).sort();
const bnKeys = Object.keys(I18N.bn).sort();
ok('i18n key parity en/bn', JSON.stringify(enKeys) === JSON.stringify(bnKeys));
ok('i18n has at least 40 keys', enKeys.length >= 40);
ok('i18n all values non-empty', enKeys.every(k => typeof I18N.en[k] === 'string' && I18N.en[k].length > 0 && typeof I18N.bn[k] === 'string' && I18N.bn[k].length > 0));
ok('i18n bn title differs from en', I18N.bn.title !== I18N.en.title);

console.log('\n' + n + ' checks passed.');
