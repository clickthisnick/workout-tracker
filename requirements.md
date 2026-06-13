# Workout Tracker — Requirements

## Overview
A single-page workout logger for tracking reps, weights, and timed exercises
across recurring routines, with a built-in rest timer and quick-entry buttons.
Designed to fit on one iPhone screen without scrolling during normal use.

## Hosting & architecture constraints
- Hosted as a static site on GitHub Pages — **no backend, no server-side code**.
- The entire app is **one self-contained `.html` file** (`workout-tracker.html`):
  - No external CSS files (theme is inlined in a `<style>` block).
  - No external audio files — the rest-timer sound is an mp3 embedded
    directly as a base64 `data:` URI in a hidden `<audio>` element, with a
    synthesized Web Audio tone as a fallback if playback fails.
- Must work with **low data and intermittent/no connectivity** after the first load:
  - Routine data, once fetched, is cached in `localStorage` and reused if a later
    fetch fails (e.g. no signal at the gym).
  - Logging a workout (reps/weights/times, navigation, timer) requires no network.

## Layout
- Single-screen design targeting iPhone-sized viewports (`100dvh`, compact
  font sizes/padding) so the whole workout view fits without a scrollbar
  during normal use.
- The header's stats (days since last workout, last session's duration,
  current session's running duration) and the "Previous" values (reps,
  weight, time) are each shown on one line, separated by `·`, wrapping only
  if needed.
- The workout-picker `<select>` is hidden via `display: none` (not
  `visibility`) once a routine is chosen, so it doesn't reserve space.

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
  blank exercise slot. The Prev button is disabled (greyed out, non-clickable)
  on the first exercise.
- **Per-exercise fields**: editable name, reps, weights, and time(s), each
  shown alongside the previous session's values for comparison.
- **Quick-increment buttons**: under both Reps and Weight, 7 tappable buttons
  let you log a set without typing. Values are based on the *previous
  session's value for the matching set number* — e.g. if you're entering set 2
  and last time set 2 was reps=6/weight=25, the buttons center on 6 and 25.
  - Tapping a button appends its value to the field (comma-separated), and
    immediately refreshes the buttons for the next set.
  - The increment is configurable (see Settings below). If a low-side offset
    would produce a value ≤ 0, it's dropped and an extra slot is added on the
    high side instead, so the total count stays at 7 — e.g. a previous value
    of 5 with increment 5 produces 5,10,15,20,25,30,35 with 5 highlighted but
    not centered.
  - **"Just did" option**: the most recently entered value in the field is
    also offered as an extra button (blue outline) for the next set, if it
    isn't already one of the 7 — e.g. if you did 12 reps for set 1 (vs. 6
    last time), 12 becomes a quick option for set 2 as well, in case you want
    to repeat it.
  - Manually typing into Reps/Weight also refreshes the quick buttons (via an
    `input` listener), so they stay aligned with whichever set you're on.
- **Rest timer**: countdown per exercise (`timer_duration` if set on that
  exercise, else the configurable default — see Settings), with an audible
  sound when it hits zero. "Save Time" appends the elapsed seconds to the
  times field.
  - Audio unlock: the first tap on *any* button on the page plays a silent
    blip (Web Audio) and does a muted play/pause of the `<audio>` element, to
    satisfy mobile browsers' "audio needs a user gesture" requirement before
    the timer's real sound is needed. Tracked via an in-memory boolean
    (`audioUnlocked`), not persisted.
- **Session duration**: header shows "Last workout: Xd ago", "Last duration:
  Xm Ys", and "Current time: Xm Ys" (live-updating).

## Settings (⚙ button)
- A ⚙ button in the top-right of the header toggles an edit panel (replacing
  the main workout view) with three fields:
  - Weight quick-button increment (default 5)
  - Reps quick-button increment (default 1)
  - Default rest timer, in seconds (default 90)
- "Apply" writes these as `weightInc`, `repsInc`, and `timerDefault` query
  parameters via `history.replaceState` (no reload — in-progress workout state
  is preserved), applies them immediately (quick buttons re-render, timer
  default updates), and returns to the main view. "Done" closes without
  changes.
- Because they live in the URL, a bookmarked/saved link with these params
  reapplies the same settings on reload, e.g.
  `?weightInc=2.5&repsInc=1&timerDefault=60&email=you@example.com`.

## Home button (🏠)
- Next to ⚙, in the header. Shows a `confirm()` dialog ("Go back to the home
  screen? This will discard the workout in progress.").
- If confirmed, navigates to the bare URL (origin + path) with only `?email=`
  preserved (if present) — dropping `name`, `file`, `currentWorkout`,
  `previousWorkout`, `currentExerciseId`, and any `weightInc`/`repsInc`/
  `timerDefault` overrides. Lands back on the routine picker.

## Saving a completed workout
- No GitHub API calls and no stored credentials/tokens.
- "Save Workout" drafts an email (`mailto:`) addressed to the address passed
  via the `email` query parameter (e.g. `?email=you@example.com`, saved as a
  bookmark — never hardcoded in the file).
- The email body is a single paste-able block:
  - `//` comment lines with the routine name, date, a link to edit the
    routine file on GitHub, and instructions to paste at the end of the
    `"workouts"` array (just before its closing `]`).
  - The new workout entry as JSON, prefixed with a comma.
- The user opens the email, opens the GitHub edit link on their phone, scrolls
  to the end of the `workouts` array, pastes the whole email body, and commits.

## Known fixes applied (vs. original implementation)
- Removed dependency on `assets/ceruleanBootswatch.min.css` and
  `sounds/a-tone-multiplied.mp3` as external files (the latter is now
  embedded as a data URI).
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
