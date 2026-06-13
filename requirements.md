# Workout Tracker — Requirements

## Overview
A single-page workout logger for tracking reps, weights, and timed exercises
across recurring routines, with a built-in rest timer.

## Hosting & architecture constraints
- Hosted as a static site on GitHub Pages — **no backend, no server-side code**.
- The entire app is **one self-contained `.html` file** (`workout-tracker.html`):
  - No external CSS files (theme is inlined in a `<style>` block).
  - No external audio files (rest-timer beep is generated with the Web Audio API).
- Must work with **low data and intermittent/no connectivity** after the first load:
  - Routine data, once fetched, is cached in `localStorage` and reused if a later
    fetch fails (e.g. no signal at the gym).
  - Logging a workout (reps/weights/times, navigation, timer) requires no network.

## Data storage
- Workout routines live in the same GitHub repo, under `src/workouts/`.
- `src/workouts/active.json` lists the available routine filenames.
- Each routine file is a JSON object:
  ```json
  {
    "name": "Routine Display Name",
    "workouts": [
      { "startMilliseconds": 0, "endMilliseconds": 0, "exercises": [ ... ] },
      { "startMilliseconds": ..., "endMilliseconds": ..., "exercises": [
          { "name": "Exercise Name", "reps": "12,12,12", "weights": "20,20,20", "times": "", "timer_duration": 90 }
        ]
      }
    ]
  }
  ```
- The app only ever reads the **last** entry in `workouts` (the most recent
  completed session) to populate the "Previous" comparison values.
- Routine JSON files may contain lines starting with `//` — these are treated
  as comments and stripped before parsing. (This lets emailed entries be
  pasted in as-is, including their instructional comment lines.)

## Core features
- **Routine selection**: dropdown populated from `active.json`.
- **Exercise navigation**: Prev/Next buttons step through the current
  routine's exercise list; stepping past the last exercise appends a new
  blank exercise slot.
- **Per-exercise fields**: editable name, reps, weights, and time(s), each
  shown alongside the previous session's values for comparison.
- **Rest timer**: countdown per exercise (`timer_duration`, default 90s),
  with an audible beep (Web Audio oscillator) when it hits zero. "Save Time"
  appends the elapsed seconds to the times field.
- **Session duration**: shows both the current session's running duration and
  the previous session's total duration.
- **Days since last done**: shown per routine.

## Saving a completed workout
- No GitHub API calls and no stored credentials/tokens.
- "Save Workout" drafts an email (`mailto:`) addressed to the address passed
  via the `email` query parameter (e.g.
  `?email=you@example.com`, saved as a bookmark — never hardcoded in the
  file).
- The email body is a single paste-able block:
  - `//` comment lines with the routine name, date, a link to edit the
    routine file on GitHub, and instructions to paste at the end of the
    `"workouts"` array (just before its closing `]`).
  - The new workout entry as JSON, prefixed with a comma.
- The user opens the email, opens the GitHub edit link on their phone, scrolls
  to the end of the `workouts` array, pastes the whole email body, and commits.

## Known fixes applied (vs. original implementation)
- Removed dependency on `assets/ceruleanBootswatch.min.css` and
  `sounds/a-tone-multiplied.mp3`.
- Fixed invalid `pass;` statement (Python syntax) in the timer reset logic.
- Fixed an undefined `name` reference in the boot/auto-start logic.
- Fixed `currentWorkout` being a shared object reference to `previousWorkout`
  (now a deep copy).
- Added cache-busting (`?t=Date.now()`, `cache: 'no-store'`) to routine fetches.

## Deferred / not implemented
- **Latest + history file split** per routine (to keep reads small as history
  grows) — considered, but not implemented; current files keep full history
  in one JSON file.
- **Full offline app-shell caching** via service worker/manifest (so the page
  itself loads with zero connectivity on a cold start) — not implemented;
  current offline support covers data caching only, after at least one
  successful page load.
