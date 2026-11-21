# Workout Tracker

A phone-friendly workout logger: static `index.html` plus `src/app.js`, no framework, no build, and no backend. Routines live in `src/workouts/*.json`. `src/workouts/active.json` lists the routines shown in the picker. The live site is [https://www.clickthisnick.com/workout-tracker/](https://www.clickthisnick.com/workout-tracker/).

Logging works offline after the page has loaded once. Reps, weight, time, the current exercise or circuit round, and your settings are stored in the URL and copied to `localStorage` under `wt_in_progress`, so a reload at the gym can restore an unfinished session.

## Run locally

```bash
npm ci
npm start
```

`npm start` serves the site at [http://localhost:8080/](http://localhost:8080/). Open it with `?email=you@example.com` bookmarked so Save can draft an email. `npm run check` is the one command that lints, typechecks, tests, and enforces the size and coverage floors. See `AGENTS.md`.

- `npm run names` — print unique exercise names from `src/workouts/*.json`

The site itself is static. Nothing is generated into `index.html` or `src/app.js`.

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
      "exercises": [{ "name": "Curl", "reps": "12,12", "weights": "20,20", "times": "" }]
    }
  ]
}
```

Set `"circuit": true` and `"sets": 3` for a circuit. `//` comment lines are allowed and are stripped before parsing. `endMilliseconds: 0` means that session was never completed; the logger shows "Last Date: never".

`npm run names` prints the unique exercise names in the top-level routine files.

## Rest-timer sound

The beep is embedded in `index.html`, so the page does not request a separate audio file. It is "A Tone" from http://soundbible.com/1815-A-Tone.html, recorded by His Self, re-encoded to mono 96 kbps at the same 1.85 second length. The old `sounds/README.md` described that recording as public domain and also linked https://creativecommons.org/licenses/by/3.0/.

Browsers that support WebMCP can drive the same actions through page tools. Other browsers keep the buttons and fields as they are.
