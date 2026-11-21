# Workout Tracker

Static phone logger. `index.html` is the page (CSS and the beep stay inline). `src/app.js` is the classic script the page loads. There is no build and no `dist/`. Archived routines under `src/workouts/archived/` and `src/workouts/archived2/` stay as they are.

The live URL is `https://www.clickthisnick.com/workout-tracker/`. Keep that path, `index.html`, and `src/app.js` working. `localStorage` keys `wt_in_progress`, `wt_cache_active`, `wt_cache_routine_*`, and `wt_last_saved` stay readable.

## Before you finish

```bash
npm ci
npm run check
```

`npm run check` is the only CI command, after `npm ci`. It runs, in order: Prettier, ESLint, `tsc --noEmit`, html-validate, stylelint, codespell, actionlint, the local link check, workout JSON shape, tests with coverage, and the size budget.

`npm start` only serves `http://localhost:8080/`.

## Rules

- Keep it simple. No new build step. Browsers run `src/app.js` as-is.
- Don't add a dependency unless this file says why.
- Keep archived workout files. Don't reformat `src/workouts/`.
- Every bug fix gets a test.
- Don't lower the coverage floor (`package.json` `test` script: lines 90, branches 67, functions 88 on `src/app.js`).
- Don't raise the size budget in `scripts/size-budget.js` (currently 128648 bytes for `index.html` + `src/app.js`).
- Don't make visible UI changes unless asked. The inline `#topStatus` size is 14px on purpose.
- Keep existing URLs and the in-progress `localStorage` shape working.

## Why these tools are installed

- `typescript` — `tsc --noEmit` with `checkJs` on `src/app.js`, `scripts/`, and `tests/`.
- `eslint`, `@eslint/js`, `globals` — flat-config lint for the app and the node scripts.
- `prettier` — formatting. Workout JSON is ignored.
- `html-validate` — HTML checks that don't fight the existing markup.
- `stylelint`, `stylelint-config-standard`, `postcss-html` — CSS inside `index.html`. Id selectors stay camelCase because the DOM ids do.
- `codespell` (pip, `requirements-dev.txt`) — spelling. `scripts/spell.js` installs it into `.cache/` on first run. Not a site dependency.
- `actionlint` — `scripts/actionlint.js` downloads the official 1.7.12 binary into `.cache/`. The npm wrappers were skipped because they unzip releases with a vulnerable `adm-zip`.
- `husky`, `lint-staged` — pre-commit runs Prettier, ESLint, stylelint, html-validate, and `tsc --noEmit`. CI runs the full `npm run check`.
- `@types/node` — types for the node scripts and tests under `checkJs`.

## CI

`.github/workflows/ci.yml` runs on `push` and `pull_request` with `permissions: contents: read`, Node 24, `npm ci`, then `npm run check`. Dependabot opens weekly grouped updates for npm, GitHub Actions, and the pip requirements.
