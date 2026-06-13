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
  - Logging a workout (reps/weights/times, navigation, timer, saving, going
    home) requires no network at all once the page itself has loaded once.
- **SPA-style navigation (critical for offline use)**: Prev/Next/start
  workout/Home no longer perform a real page navigation
  (`location.href = ...`). Each of those produced a unique URL+querystring
  (since `currentWorkout` is embedded as JSON in the query string) that the
  browser had never fetched before — with no connectivity, that navigation
  would simply fail. Instead, `reloadPage()` calls
  `history.replaceState()`/`pushState()` to update the URL bar (so reload/
  bookmark/share still capture the right state) and then calls `renderPage()`
  directly to update the DOM in place, with zero network requests.
  - Side effect: since the JS context now persists across exercises instead
    of getting a fresh start on every reload, `renderPage()` explicitly
    resets per-exercise state at the top of each render: clears any running
    rest timer (`timerInterval`), resets `currentTimer` and the `#timer`
    display, clears `timerTriggeredIndices` (which set-indices have already
    auto-started the timer), and clears/recreates the live
    duration-update interval (`durationInterval`).
- **In-progress workout backup (localStorage)**: a plain browser *reload* is
  still a real network request for the current URL+querystring. If offline,
  the browser may fail to refetch that exact URL and fall back to an older
  cached version of the page (e.g. from earlier in the same session, with a
  shorter/stale querystring) — which would otherwise silently lose progress.
  - On every navigation (`reloadPage`) and on every button press / field edit
    (`persistCurrentState`), the key state — `name`, `file`, `currentWorkout`,
    `previousWorkout`, `currentExerciseId` — is mirrored into
    `localStorage['wt_in_progress']`.
  - **Persisted on any button press**: a bubble-phase `click` listener on
    `document` (separate from the capture-phase audio-unlock listener) calls
    `persistCurrentState()` after any `<button>`'s own handler runs — this
    captures the current reps/weights/times/exercise-name field values into
    `currentWorkout` even for actions that don't normally navigate (quick-
    button taps, Save Time, Timer, etc.).
  - **Persisted on typing**: `input` listeners on the reps, weights, times,
    and exercise-name fields also call `persistCurrentState()` on every
    keystroke, so manually-typed values aren't lost either.
  - `persistCurrentState()` no-ops if no workout is in progress (e.g. on the
    picker screen).
  - On boot, if `localStorage` has a saved session and either the URL has no
    workout in progress, or its `file` matches the saved session's `file`,
    the saved state is restored (overwriting the URL's params) before
    rendering — i.e. the backup wins over whatever stale URL the browser
    actually served. If the URL points at a *different* routine (e.g. a
    freshly shared link), the URL's state is used instead.
  - The Home button (🏠) clears this backup (`clearInProgressState()`), since
    it's an explicit "discard this workout" action.

## Layout
- Single-screen design targeting iPhone-sized viewports (`100dvh`, compact
  font sizes/padding) so the whole workout view fits without a scrollbar
  during normal use.
- The header's top row shows the routine name (truncated with an ellipsis if
  too long), an exercise-position indicator (e.g. "3 / 7"), and the 🏠/⚙
  buttons. The stats row below shows "Last Date: Xd ago · Last Time: Xm Ys ·
  Cur Time: Xm Ys" (11px), and the "Previous" values (reps, weight, time) are
  on one line, separated by `·`, wrapping only if needed.
- The workout-picker `<select>` is hidden via `display: none` (not
  `visibility`) once a routine is chosen, so it doesn't reserve space.
- **Zoom prevention**:
  - Viewport meta tag sets `maximum-scale=1, user-scalable=no` to discourage
    pinch-zoom (newer iOS Safari versions may partially ignore this for
    accessibility reasons).
  - `touch-action: manipulation` on `html, body` suppresses double-tap-to-zoom.
  - All text inputs and the routine `<select>` are kept at `font-size: 16px`
    (the threshold below which iOS Safari auto-zooms the whole page on
    focus); buttons and quick-buttons stay smaller/compact since they aren't
    affected by this behavior.
- **Scroll/bounce prevention**: `overscroll-behavior: none` on `html, body`
  stops iOS Safari's rubber-band overscroll effect (the page sliding/bouncing
  when scrolled past the top or bottom). Requires iOS 16+; older iOS may still
  show some bounce.

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
- `active.json` and each fetched routine file are cached in `localStorage`
  (`wt_cache_active`, `wt_cache_routine_<file>`). If a later fetch fails
  (offline), the cached copy is used instead, with a "📴 Offline" status
  message.

## Core features
- **Routine selection**: dropdown populated from `active.json`.
- **Exercise navigation**: Prev/Next buttons step through the current
  routine's exercise list; stepping past the last exercise appends a new
  blank exercise slot. The Prev button is disabled (greyed out, non-clickable)
  on the first exercise. The header shows "current / total" (e.g. "3 / 7"),
  updating as you navigate (and reflecting newly appended slots, e.g. "8 / 8").
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
    also highlighted as an option for the next set, in case you want to
    repeat it — e.g. if you did 12 reps for set 1 (vs. 6 last time), 12 is
    highlighted for set 2 as well. If 12 isn't already one of the 7 generated
    buttons, it's added as an extra option; if it *is* already one of them
    (e.g. it coincides with the previous-session value), that same button
    gets both highlights.
  - **Highlight styling (color + shape, for grayscale accessibility)**:
    - "Previous value" button: red/accent border, **solid** 2px border, plus
      a "●" symbol after the number.
    - "Just did" button: blue border, **dashed** 2px border, plus a "▲"
      symbol after the number.
    - If both apply to the same button: a **double** 4px border and both
      symbols ("●▲"). Color, border style, and symbol are all redundant
      indicators so the distinction holds even with color removed (e.g.
      grayscale display mode).
  - **Legend**: a small dim caption under the "Previous" row reads "● = same
    as prev workout   ▲ = what you just entered", explaining the symbols
    inline.
  - Manually typing into Reps/Weight also refreshes the quick buttons (via an
    `input` listener), so they stay aligned with whichever set you're on.
  - **Auto-starts the rest timer**: tapping a quick button (re)starts the
    rest timer, but only once per *set index*, regardless of whether reps or
    weight triggers it first — reps and weight at the same index are treated
    as one pair. E.g. tapping reps[0] then weight[0] only resets the timer
    once (on the reps[0] tap); tapping reps[0], reps[1], weight[0], weight[1]
    resets it twice (on reps[0] and reps[1] — indices 0 and 1 are already
    "used" by the time the weight taps happen, so those do nothing). This is
    tracked in `timerTriggeredIndices`, a `Set` reset at the top of every
    `renderPage()` call (i.e. each time you navigate to a different exercise).
- **Rest timer**: countdown per exercise (`timer_duration` if set on that
  exercise, else the configurable default — see Settings), with an audible
  sound when it hits zero. "Save Time" appends the elapsed seconds to the
  times field. Can also be started/restarted manually via the "Timer" button
  at any time (e.g. if a set was logged by typing instead of tapping a quick
  button).
  - Audio unlock: the first tap on *any* button on the page plays a silent
    blip (Web Audio) and does a muted play/pause of the `<audio>` element, to
    satisfy mobile browsers' "audio needs a user gesture" requirement before
    the timer's real sound is needed. Tracked via an in-memory boolean
    (`audioUnlocked`), not persisted.
- **Session duration**: header shows "Last Date: Xd ago", "Last Time: Xm Ys",
  and "Cur Time: Xm Ys" (live-updating, via `durationInterval`).

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
- If confirmed: stops any running rest/duration timers, drops all query
  params except `?email=` (if present), updates the URL via
  `history.pushState` (no reload), clears the localStorage in-progress
  backup, and resets the UI to the routine-picker view
  (`resetToPickerView()` — hides the workout view, re-shows the `<select>`,
  resets it to the placeholder option, and re-populates it from
  cache/network if it was never populated, e.g. when arriving via a direct
  "in progress workout" link).

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
- Replaced `location.href`-based navigation between exercises/Home with
  `history.replaceState`/`pushState` + in-place re-render, fixing offline use
  (see "SPA-style navigation" above).
- Added a localStorage-backed in-progress workout backup, restored on boot
  when it's at least as fresh as the URL's state, to survive offline reloads
  (see "In-progress workout backup" above).

## Deferred / not implemented
- **Latest + history file split** per routine (to keep reads small as history
  grows) — considered, but not implemented; current files keep full history
  in one JSON file.
- **Full offline app-shell caching** via service worker/manifest (so the page
  itself loads with zero connectivity on a true cold start, before it's ever
  been visited) — not implemented; current offline support covers data and
  in-app navigation only, after at least one successful page load.
- Other feature ideas discussed but not built: "Set X of Y" indicator per
  exercise (alongside the now-implemented "current / total" exercise
  counter), vibration on timer completion, visual pulse on the Timer button
  while running, skip/reorder exercises within a session.
