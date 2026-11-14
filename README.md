# Workout Tracker

A phone-friendly workout logger: one static `index.html` file, no framework and no backend. Routines live in `src/workouts/*.json`. `src/workouts/active.json` lists the routines shown in the picker. The live site is [https://www.clickthisnick.com/workout-tracker/](https://www.clickthisnick.com/workout-tracker/).

Logging works offline after the page has loaded once. Reps, weight, time, the current exercise or circuit round, and your settings are stored in the URL and copied to `localStorage` under `wt_in_progress`, so a reload at the gym can restore an unfinished session.

## Run locally

```bash
npm ci
npm start
```

`npm start` checks the workout files, lints, and serves the site at [http://localhost:8080/](http://localhost:8080/). Open it with `?email=you@example.com` bookmarked so Save can draft an email.

- `npm run build` — ESLint plus `scripts/check.js` (workout JSON shape, including exercise name and `endMilliseconds` for active routines)
- `npm test` — behavior tests for navigation, the rest timer, save, and restore
- `npm run lint` — ESLint on `scripts/` and `tests/`

## Saving a workout

Save Workout does not write to GitHub from the phone. It builds a paste-ready block (comment lines plus one JSON session), copies it to the clipboard, shows it on the page, and opens a `mailto:` draft when `?email=` is set. Paste that block at the end of the routine's `"workouts"` array and commit.

Add `?email=you@example.com` to the URL you bookmark. If that parameter is missing, Save says so and still copies the entry.

Home discards the in-progress session and keeps `email`, `weightInc`, `repsInc`, and `timerDefault`.

## Routines

Each active file looks like this:

```json
{
  "name": "Routine Display Name",
  "workouts": [
    {
      "startMilliseconds": 0,
      "endMilliseconds": 0,
      "exercises": [
        { "name": "Curl", "reps": "12,12", "weights": "20,20", "times": "" }
      ]
    }
  ]
}
```

Set `"circuit": true` and `"sets": 3` for a circuit. `//` comment lines are allowed and are stripped before parsing. `endMilliseconds: 0` means that session was never completed; the logger shows "Last Date: never".

`python3 generateAllExerciseNamePermutations.py` prints the unique exercise names in `src/workouts`.
