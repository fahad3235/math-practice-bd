'use strict';
// Math Practice BD - pure logic, no DOM, no network.
// rng is injectable for deterministic tests; defaults to Math.random.
(function (root) {
  var OPS = ['+', '-', 'x', '/'];
  var OP_SYMBOL = { '+': '+', '-': '-', 'x': '\u00d7', '/': '\u00f7' };
  var DIFFICULTY = ['easy', 'medium', 'hard'];

  function randInt(min, max, rng) {
    var r = rng || Math.random;
    return Math.floor(r() * (max - min + 1)) + min;
  }

  function makeQuestion(op, difficulty, rng) {
    var r = rng || Math.random;
    var a, b, answer;
    if (difficulty === 'easy') {
      if (op === '+') { a = randInt(0, 20, r); b = randInt(0, 20 - a, r); answer = a + b; }
      else if (op === '-') { a = randInt(0, 20, r); b = randInt(0, a, r); answer = a - b; }
      else if (op === 'x') { a = randInt(2, 5, r); b = randInt(1, 9, r); answer = a * b; }
      else if (op === '/') { b = randInt(2, 5, r); answer = randInt(1, 9, r); a = b * answer; }
      else { throw new Error('unknown op: ' + op); }
    } else if (difficulty === 'medium') {
      if (op === '+') { a = randInt(10, 99, r); b = randInt(10, Math.min(99, 199 - a), r); answer = a + b; }
      else if (op === '-') { a = randInt(10, 99, r); b = randInt(10, a, r); answer = a - b; }
      else if (op === 'x') { a = randInt(2, 9, r); b = randInt(2, 9, r); answer = a * b; }
      else if (op === '/') { b = randInt(2, 12, r); answer = randInt(2, 12, r); a = b * answer; }
      else { throw new Error('unknown op: ' + op); }
    } else if (difficulty === 'hard') {
      if (op === '+') { a = randInt(100, 999, r); b = randInt(100, 999, r); answer = a + b; }
      else if (op === '-') { a = randInt(100, 999, r); b = randInt(100, a, r); answer = a - b; }
      else if (op === 'x') { a = randInt(12, 99, r); b = randInt(2, 9, r); answer = a * b; }
      else if (op === '/') { b = randInt(2, 19, r); answer = randInt(12, 99, r); a = b * answer; }
      else { throw new Error('unknown op: ' + op); }
    } else {
      throw new Error('unknown difficulty: ' + difficulty);
    }
    return { a: a, b: b, op: op, answer: answer, text: formatQ(a, b, op) };
  }

  function formatQ(a, b, op) {
    return a + ' ' + OP_SYMBOL[op] + ' ' + b + ' = ?';
  }

  function scoreFor(streak) {
    return streak >= 3 ? 15 : 10;
  }

  function gradeFor(accuracy) {
    if (accuracy >= 90) return 'Excellent';
    if (accuracy >= 70) return 'Good';
    if (accuracy >= 50) return 'Fair';
    return 'Keep Practicing';
  }

  var BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
  function toBnDigits(str) {
    return String(str).replace(/[0-9]/g, function (d) { return BN_DIGITS[Number(d)]; });
  }

  var api = {
    OPS: OPS, DIFFICULTY: DIFFICULTY, OP_SYMBOL: OP_SYMBOL,
    randInt: randInt, makeQuestion: makeQuestion, formatQ: formatQ,
    scoreFor: scoreFor, gradeFor: gradeFor, toBnDigits: toBnDigits
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { root.MathLogic = api; }
})(typeof window !== 'undefined' ? window : this);
