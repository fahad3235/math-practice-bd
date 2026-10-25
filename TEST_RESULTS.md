# TEST_RESULTS — Math Practice BD

Run date: 2026-10-25 (Asia/Dhaka). All numbers below are from this run only.

## Unit tests — `node tests/test.js`

- **Result: 37 checks passed, 0 failed.**
- Breakdown: 12 seeded invariant groups (every operation × every difficulty, 200 seeded samples each = 2,400 generated questions; each checked for correct answer math, operand ranges, division exactness, and non-negative subtraction) + 25 individual checks (randInt range, scoreFor boundaries 0/2/3/10, gradeFor boundaries 100/90/89/70/69/50/49/0, toBnDigits, formatQ symbols, makeQuestion text match, unknown op/difficulty throws, i18n key parity, key count, non-empty values, bn title differs).
- i18n key count: 48 keys in both `en` and `bn`, identical key sets.

## Smoke tests — `node tests/smoke.js` (headless Chromium via raw CDP, port 9334, file:// page)

- **Result: 26 checks passed, 0 failed.**
- Hand-verified values from the run:
  - 3 correct answers in a row score 10 + 10 + 15 = **35**, streak **3** (15-point bonus kicks in at streak 3).
  - Empty and non-numeric answers show an inline error; no crash, no console error.
  - One wrong answer resets streak to **0** and its feedback shows the correct answer.
  - Skip advances the Practice progress counter.
  - Completing all 20 Practice questions correctly shows the results panel with **20 answered, 100% accuracy**.
  - Language toggle switches the title to Bangla and the results score shows Bengali digits.
  - Best score persists in `localStorage` (`mathpractice_best`) across a page reload.
  - 390 px viewport: no horizontal overflow; zero console errors / page exceptions.

## Source-file ASCII check

- `grep -P '[^\x00-\x7F]'` over `*.html`, `*.css`, `*.js` (including `tests/`): **no matches** — all source files are pure ASCII; Bengali text exists only as `\uXXXX` escapes in JS (and the README, which is allowed UTF-8, is not a source file).

## Repairs

- None required in either suite. One preventive fix was made before the first test run: the language toggle now re-renders the results panel fields (via `renderResultsFields()`), so switching to Bangla after a game also converts the results digits — this was a design fix, not a response to a failing test.
- Repair cycles used: 0 of the allowed 2 per category.

## Unresolved failures

- None.
