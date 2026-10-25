# Math Practice BD

An offline, bilingual (English / বাংলা) arithmetic drill game for students in Bangladesh. Pick a mode, pick your operations, pick a difficulty, and answer live questions with instant feedback, streaks, and a results breakdown. No account, no server, no network requests — everything runs in the browser and progress is stored only in `localStorage`.

## Problem

Mental-arithmetic practice tools are often ad-heavy, account-gated, or English-only. Students who want a quick, focused drill — before class, on a bus, or with patchy connectivity — need something that opens instantly, works offline, and speaks their language.

## Features

1. **Two game modes** — Sprint (60-second countdown, answer as many as you can) and Practice (20 questions at your own pace).
2. **Four operations** — addition, subtraction, multiplication, division; at least one must be selected before starting.
3. **Three difficulty levels** — Easy, Medium, Hard, with operand ranges that grow with the level (see Limitations for the exact ranges).
4. **Live feedback and scoring** — instant correct/wrong feedback (wrong answers reveal the correct answer), streak tracking, 10 points per answer, 15 once a streak reaches 3.
5. **Results screen** — score, answered, correct, accuracy, best streak, grade, and a per-operation breakdown.
6. **Bilingual UI** — one-tap English / বাংলা toggle, persisted in `localStorage`; numbers are shown in Bengali digits in Bangla mode.
7. **Session history and best scores** — best score per mode and the last 20 sessions, stored locally; history clears only after typing `DELETE`.
8. **Keyboard friendly** — press Enter to submit an answer.

## Stack

- Plain HTML, CSS, and JavaScript — no framework, no build step, no dependencies.
- Node.js (for tests only) and headless Chromium (for smoke tests only).

## Prerequisites

- Any modern browser to play.
- Node.js 18+ only if you want to run the tests.

## Install

No install step. Open `index.html` in a browser, or serve the folder with any static server:

```sh
npx serve .
# or
python3 -m http.server 8000
```

## Dev commands

There is no build step. Edit `index.html`, `style.css`, `logic.js`, `i18n.js`, or `app.js` and refresh the browser.

## Testing

```sh
node tests/test.js    # unit tests: question invariants, scoring, grades, digits, i18n parity
node tests/smoke.js   # headless-Chrome smoke tests via raw CDP (port 9334, file:// page)
```

See `TEST_RESULTS.md` for the real numbers from the latest run.

## Deployment

GitHub Pages, `main` branch, root folder: push this folder's contents to the repository root and enable Pages (Settings → Pages → Deploy from branch → `main` / `/ (root)`). The app makes zero network requests, so it works as a static site.

## Difficulty ranges

- **Easy** — +/- within 0–20 (sums at most 20, differences never negative); x tables 2–5 × 1–9; division exact, divisor 2–5, quotient 1–9.
- **Medium** — +/- two-digit operands 10–99 (sums at most 199, differences never negative); x 2–9 × 2–9; division exact, divisor 2–12, quotient 2–12.
- **Hard** — +/- three-digit operands 100–999 (differences never negative); x two-digit 12–99 × one-digit 2–9; division exact, divisor 2–19, quotient 12–99.

Division answers are always integers and subtraction is never negative, at every level.

## Limitations

- Practice is personal and offline: scores and history live only in the current browser's `localStorage` and are lost if site data is cleared.
- Sprint mode counts only questions answered before the 60-second timer ends; the in-flight question at timeout is not counted.
- Grade labels (Excellent / Good / Fair / Keep Practicing) are shown in English even in Bangla mode; the surrounding label is translated.
- This is a personal practice tool, not a school exam or a certified assessment.

## Status

Complete MVP: built and tested (unit + headless-Chrome smoke). Not yet published — no repository or Pages site has been created for it.
