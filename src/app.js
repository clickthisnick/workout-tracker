/**
 * Phone workout logger. index.html loads this file as-is; nothing is bundled.
 * Tests call install() with a stub window.
 *
 * A session is `{ startMilliseconds, endMilliseconds, exercises: [{ name, reps, weights, times }] }`.
 */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root.document) {
    api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  /**
   * Attach the logger to a window and boot from its URL and storage.
   * The host object is loosely typed so the DOM calls stay as they are.
   * @param {any} root
   * @returns {Record<string, any>}
   */
  function install(root) {
    const document = root.document;
    const location = root.location;
    const history = root.history;
    const localStorage = root.localStorage;
    const sessionStorage = root.sessionStorage;
    const navigator = root.navigator;
    const window = root;
    const fetch = root.fetch.bind(root);
    const confirm = root.confirm.bind(root);
    const Date = root.Date;
    const setTimeout = root.setTimeout.bind(root);
    const setInterval = root.setInterval.bind(root);
    const clearInterval = root.clearInterval.bind(root);

    // ---------------------------------------------------------------
    // Config
    // ---------------------------------------------------------------
    // Workout files live relative to index.html. Resolve them against the
    // page origin + directory so the same build works hosted at a sub-path
    // (https://www.clickthisnick.com/workout-tracker/) and served locally.
    const baseUrl =
      location.protocol === 'file:'
        ? location.href.replace(/index\.html$/, '').replace(/\/$/, '')
        : new URL('./', location.href).href.replace(/\/$/, '');

    const url = new URL(location.href);

    // Quick-increment buttons shown under Reps/Weight, based on the previous
    // session's last value for that exercise. Each offset is multiplied by
    // the increment and added to the previous value; 0 = previous value as-is.
    // Increments (and the default rest timer) are editable via the ⚙ button,
    // which stores the chosen values in the URL so they survive a reload.
    const SETTINGS_DEFAULTS = {
      weightInc: 5,
      repsInc: 1,
      timerDefault: 90
    };

    const QUICK_BUTTON_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];

    const QUICK_BUTTON_CONFIG = {
      weights: { increment: SETTINGS_DEFAULTS.weightInc, offsets: QUICK_BUTTON_OFFSETS },
      reps: { increment: SETTINGS_DEFAULTS.repsInc, offsets: QUICK_BUTTON_OFFSETS }
    };

    let DEFAULT_TIMER_DURATION = SETTINGS_DEFAULTS.timerDefault;

    /**
     * @returns {{weightInc: number, repsInc: number, timerDefault: number}}
     */
    function getSettings() {
      return {
        weightInc: parseFloat(url.searchParams.get('weightInc')) || SETTINGS_DEFAULTS.weightInc,
        repsInc: parseFloat(url.searchParams.get('repsInc')) || SETTINGS_DEFAULTS.repsInc,
        timerDefault:
          parseInt(url.searchParams.get('timerDefault'), 10) || SETTINGS_DEFAULTS.timerDefault
      };
    }

    // Applies the current settings (from the URL, or defaults) to the
    // live config objects used elsewhere in the app.
    function applySettings() {
      const s = getSettings();
      QUICK_BUTTON_CONFIG.weights.increment = s.weightInc;
      QUICK_BUTTON_CONFIG.reps.increment = s.repsInc;
      DEFAULT_TIMER_DURATION = s.timerDefault;
    }

    applySettings();

    // GitHub repo info, used to build the "edit this file" link in the email
    const GH_OWNER = 'clickthisnick';
    const GH_REPO = 'workout-tracker';
    const GH_BRANCH = 'main';

    // ---------------------------------------------------------------
    // Timer-complete sound: plays the embedded a-tone-multiplied.mp3
    // (embedded as a base64 data URI, so no external file dependency),
    // falling back to a synthesized tone if playback fails for any reason.
    // ---------------------------------------------------------------
    let audioCtx = null;
    let timerInterval = '';
    let currentTimer = 0;
    let currentTimerStart = null;
    let durationInterval = null;

    // Tracks whether we've already unlocked audio during this page load.
    // Mobile browsers only allow audio after a user gesture has played
    // something, so the first click anywhere "unlocks" audio with a
    // silent/muted blip before the real timer-complete sound is needed.
    let audioUnlocked = false;

    function ensureAudioCtx() {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtx) {
        audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended' && audioCtx.resume) {
        audioCtx.resume();
      }
      return audioCtx;
    }

    function unlockAudio() {
      if (audioUnlocked) return;
      audioUnlocked = true;

      try {
        const ctx = ensureAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0; // silent
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.01);
      } catch (e) {
        console.error('audio context unlock failed', e);
      }

      const audioEl = document.getElementById('beepSound');
      if (audioEl) {
        audioEl.muted = true;
        const p = audioEl.play();
        const reset = () => {
          audioEl.pause();
          audioEl.currentTime = 0;
          audioEl.muted = false;
        };
        if (p && typeof p.then === 'function') {
          p.then(reset).catch(reset);
        } else {
          reset();
        }
      }
    }

    // Any button press anywhere on the page counts as the user gesture
    // that unlocks audio playback.
    document.addEventListener(
      'click',
      (e) => {
        if (e.target.closest && e.target.closest('button')) {
          unlockAudio();
        }
      },
      true
    );

    function beep() {
      const audioEl = document.getElementById('beepSound');
      if (audioEl) {
        try {
          audioEl.currentTime = 0;
          const p = audioEl.play();
          if (p && typeof p.then === 'function') {
            p.catch((e) => {
              console.warn('beep audio failed, falling back to tone', e);
              beepTone();
            });
          }
          return;
        } catch (e) {
          console.warn('beep audio failed, falling back to tone', e);
        }
      }
      beepTone();
    }

    function beepTone() {
      try {
        const ctx = ensureAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {
        console.error('beep tone failed', e);
      }
    }

    // ---------------------------------------------------------------
    // Loading the list of workouts / a specific workout
    //
    // Routine files may contain lines starting with "//" (left behind
    // by pasting an emailed entry that included instructions). Strip
    // those before parsing so plain JSON.parse still works.
    // ---------------------------------------------------------------
    /**
     * Strip emailed `//` instructions and parse a routine or session.
     * @param {string} text
     * @returns {any}
     */
    function parseJsonWithComments(text) {
      return JSON.parse(text.replace(/^[ \t]*\/\/.*$/gm, ''));
    }

    async function routineLabel(file) {
      const cacheKey = `wt_cache_routine_${file}`;
      const fromData = (data) =>
        data && typeof data.name === 'string' && data.name.trim() ? data.name.trim() : file;
      try {
        const response = await fetch(`${baseUrl}/src/workouts/${file}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = parseJsonWithComments(await response.text());
        localStorage.setItem(cacheKey, JSON.stringify(data));
        return fromData(data);
      } catch (e) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            return fromData(JSON.parse(cached));
          } catch (err) {
            // cached copy is unreadable; show the filename
          }
        }
        return file;
      }
    }

    const loadWorkoutOptions = async () => {
      let workouts;
      try {
        const response = await fetch(`${baseUrl}/src/workouts/active.json?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        workouts = parseJsonWithComments(await response.text());
        localStorage.setItem('wt_cache_active', JSON.stringify(workouts));
      } catch (e) {
        console.warn('Could not fetch active.json, falling back to cache', e);
        const cached = localStorage.getItem('wt_cache_active');
        if (cached) {
          try {
            workouts = JSON.parse(cached);
          } catch (err) {
            setTopStatus('Could not read the cached workout list.');
            return;
          }
          setTopStatus('📴 Offline — showing your cached workout list.');
        } else {
          setTopStatus(
            '📴 No connection and nothing cached yet — connect to the internet once to load your routines.'
          );
          return;
        }
      }

      const workoutNames = workouts && workouts['workouts'];
      if (!Array.isArray(workoutNames)) {
        setTopStatus('Could not read the workout list.');
        return;
      }
      const select = document.getElementById('selectWorkout');
      const labels = [];
      for (const file of workoutNames) {
        labels.push({ file, name: await routineLabel(file) });
      }
      const counts = {};
      for (const item of labels) counts[item.name] = (counts[item.name] || 0) + 1;
      for (const item of labels) {
        const el = document.createElement('option');
        el.value = item.file;
        el.textContent = counts[item.name] > 1 ? `${item.name} (${item.file})` : item.name;
        select.appendChild(el);
      }
    };

    const getData = async (routine) => {
      const cacheKey = `wt_cache_routine_${routine}`;
      let resp;

      try {
        const response = await fetch(`${baseUrl}/src/workouts/${routine}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        resp = parseJsonWithComments(await response.text());
        localStorage.setItem(cacheKey, JSON.stringify(resp));
      } catch (e) {
        console.warn(`Could not fetch ${routine}, falling back to cache`, e);
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            resp = JSON.parse(cached);
          } catch (err) {
            setTopStatus(`Couldn't read the saved copy of "${routine}".`);
            showPicker();
            return;
          }
        } else {
          setTopStatus(
            `📴 Couldn't load "${routine}" and no offline copy is saved yet. Connect to the internet once to download it.`
          );
          showPicker();
          return;
        }
      }

      if (!resp || !Array.isArray(resp.workouts) || resp.workouts.length === 0) {
        setTopStatus(`Couldn't start "${routine}" — that file has no workouts yet.`);
        showPicker();
        return;
      }
      const previousWorkout = resp.workouts[resp.workouts.length - 1];
      if (
        !previousWorkout ||
        !Array.isArray(previousWorkout.exercises) ||
        previousWorkout.exercises.length === 0
      ) {
        setTopStatus(`Couldn't start "${routine}" — the latest session has no exercises.`);
        showPicker();
        return;
      }

      const firstReps = previousWorkout.exercises[0] && previousWorkout.exercises[0].reps;
      const inferredSets = firstReps
        ? String(firstReps)
            .split(',')
            .filter((part) => part.trim() !== '').length || 1
        : 1;
      const sets =
        resp.sets !== undefined && resp.sets !== null && String(resp.sets) !== ''
          ? String(resp.sets)
          : String(inferredSets);

      url.searchParams.set('name', resp.name || routine);
      url.searchParams.set('file', routine);
      url.searchParams.set('previousWorkout', JSON.stringify(previousWorkout));
      url.searchParams.set('circuit', resp.circuit ? '1' : '0');
      url.searchParams.set('sets', sets);

      const currentWorkout = JSON.parse(JSON.stringify(previousWorkout));
      currentWorkout['startMilliseconds'] = getTimeMillisecondsDate();
      currentWorkout['endMilliseconds'] = 0;

      for (let i = 0; i < currentWorkout['exercises'].length; i++) {
        currentWorkout['exercises'][i]['reps'] = '';
        currentWorkout['exercises'][i]['weights'] = '';
        currentWorkout['exercises'][i]['times'] = '';
      }

      url.searchParams.set('currentWorkout', JSON.stringify(currentWorkout));
      url.searchParams.set('currentExerciseId', String(0));
      url.searchParams.set('currentRound', String(0));

      setTopStatus('');
      reloadPage(url);
    };

    // ---------------------------------------------------------------
    // Small helpers
    // ---------------------------------------------------------------
    function decodeQueryParam(p) {
      const normalized = String(p == null ? '' : p).replace(/\+/g, ' ');
      try {
        return decodeURIComponent(normalized);
      } catch (e) {
        return normalized;
      }
    }

    function getTimeMillisecondsDate() {
      return new Date().getTime();
    }

    // Updates the URL's query string (so it stays bookmarkable/reloadable
    // with the same state) WITHOUT a full page navigation. A real navigation
    // (location.href = ...) would make the browser fetch this exact
    // URL+querystring from the network, which fails when offline since that
    // specific combination was never cached. history.replaceState + a manual
    // re-render keeps everything working with no connectivity.
    function reloadPage(targetUrl) {
      history.replaceState(null, '', targetUrl.toString());
      saveInProgressState();
      renderPage();
    }

    // ---------------------------------------------------------------
    // In-progress workout backup (localStorage)
    //
    // The URL's query string is the primary source of truth (so links can be
    // shared/bookmarked mid-workout), but a plain page *reload* is a real
    // network request for that exact URL+querystring. If offline, the browser
    // may fail to refetch it and fall back to whatever shorter/older URL it
    // does have cached -- which would otherwise silently lose all progress.
    // As a safety net, the same state is mirrored into localStorage and
    // restored on boot if the URL doesn't already have it.
    // ---------------------------------------------------------------
    const IN_PROGRESS_KEY = 'wt_in_progress';
    const LAST_SAVED_KEY = 'wt_last_saved';
    // circuit/sets and the settings params have to travel with the backup.
    // Without them a mid-circuit reload comes back as a linear workout, and
    // weightInc/repsInc/timerDefault fall back to the defaults.
    const IN_PROGRESS_FIELDS = [
      'name',
      'file',
      'currentWorkout',
      'previousWorkout',
      'currentExerciseId',
      'currentRound',
      'circuit',
      'sets',
      'weightInc',
      'repsInc',
      'timerDefault',
      'settings',
      'email'
    ];

    function saveInProgressState() {
      if (isFinishedWorkout(url.searchParams.get('currentWorkout'))) {
        clearInProgressState();
        return;
      }
      const state = {};
      for (const field of IN_PROGRESS_FIELDS) {
        state[field] = url.searchParams.get(field);
      }
      try {
        localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Could not save in-progress state', e);
      }
    }

    function loadInProgressState() {
      try {
        const raw = localStorage.getItem(IN_PROGRESS_KEY);
        if (!raw) return null;
        const state = JSON.parse(raw);
        if (!state.name || !state.currentWorkout || !state.previousWorkout) return null;
        return state;
      } catch (e) {
        return null;
      }
    }

    function clearInProgressState() {
      try {
        localStorage.removeItem(IN_PROGRESS_KEY);
      } catch (e) {
        // ignore
      }
    }

    // Captures whatever's currently typed/tapped into the reps/weights/times/
    // name fields into `currentWorkout` and re-saves the localStorage backup.
    // Without this, only Next/Prev/Save (which already call saveExerciseData)
    // would update the backup -- so e.g. tapping quick-buttons for several
    // sets and then losing connectivity before pressing Next could lose that
    // data on reload. No-ops if no workout is in progress.
    function persistCurrentState() {
      if (!url.searchParams.get('currentWorkout')) return;
      // A finished session must not be written back. The Save button's click
      // listener runs after saveWorkout(), and would otherwise restore the backup.
      if (isFinishedWorkout(url.searchParams.get('currentWorkout'))) {
        clearInProgressState();
        return;
      }
      try {
        if (isCircuitWorkout()) {
          saveCircuitState(url);
        } else {
          saveExerciseData(url);
        }
      } catch (e) {
        console.warn('Could not persist current state', e);
        return;
      }
      saveInProgressState();
    }

    // Runs after a button's own click handler (bubble phase, vs. the capture-
    // phase audio-unlock listener above), so it captures any DOM updates that
    // handler just made (e.g. a quick-button appending a value).
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('button')) {
        persistCurrentState();
      }
    });

    /**
     * @param {string | null | undefined} data
     * @returns {{startMilliseconds: number, endMilliseconds: number, exercises: any[]}}
     */
    function loadJSONQueryParameter(data) {
      if (data == null || data === '') throw new Error('Missing workout state');
      return JSON.parse(decodeQueryParam(data));
    }

    function isFinishedWorkout(data) {
      try {
        const workout = data && typeof data === 'object' ? data : loadJSONQueryParameter(data);
        return !!(workout && Number(workout.endMilliseconds) > 0);
      } catch (e) {
        return false;
      }
    }

    function calculateLastWorkoutDuration(milliseconds) {
      let minutes = Math.floor(milliseconds / 1000 / 60);
      let seconds = Math.round((milliseconds - minutes * 1000 * 60) / 1000);
      return [minutes, seconds];
    }

    function calulateDaysAgo(endMilliseconds) {
      const ms = getTimeMillisecondsDate();
      const msSinceWorkout = ms - endMilliseconds;
      return Math.floor(msSinceWorkout / (1000 * 60 * 60) / 24);
    }

    function setCurrentWorkoutDuration(currentWorkout) {
      const start = Number(currentWorkout && currentWorkout['startMilliseconds']) || Date.now();
      const elapsed = Math.max(0, Date.now() - start);
      const minutes = Math.floor(elapsed / (1000 * 60));
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
      const el = document.getElementById('workoutCurrentDuration');
      if (el) el.textContent = `Cur Time: ${minutes}m ${seconds}s`;
    }

    function formatLastCompleted(endMilliseconds) {
      if (!endMilliseconds || Number(endMilliseconds) <= 0) return 'Last Date: never';
      return `Last Date: ${calulateDaysAgo(endMilliseconds)}d ago`;
    }

    function setDocumentTitle(text) {
      if (typeof document !== 'undefined' && document) document.title = text;
    }

    function updateWorkoutTitle(routineName) {
      let detail;
      if (url.searchParams.get('settings') === '1') {
        detail = 'Settings';
      } else if (isCircuitWorkout()) {
        detail = `Round ${currentRoundIndex() + 1} of ${circuitTotalRounds()}`;
      } else {
        const count = document.getElementById('exerciseCount');
        const exercise = document.getElementById('currentExerciseName');
        const exerciseName = exercise && exercise.value ? exercise.value : 'Exercise';
        const pos = count && count.textContent ? count.textContent : '';
        detail = pos ? `${exerciseName} (${pos})` : exerciseName;
      }
      const parts = [];
      if (detail) parts.push(detail);
      if (routineName) parts.push(routineName);
      parts.push('Workout Tracker');
      setDocumentTitle(parts.join(' · '));
    }

    function showPicker() {
      const picker = document.getElementById('picker');
      if (picker) picker.hidden = false;
      const select = document.getElementById('selectWorkout');
      if (select) select.hidden = false;
      const workout = document.getElementById('workout');
      if (workout) workout.hidden = true;
      setDocumentTitle('Workout Tracker');
    }

    function fallbackToPicker(message) {
      clearInProgressState();
      const keep = ['email', 'weightInc', 'repsInc', 'timerDefault'];
      const preserved = {};
      for (const key of keep) {
        const value = url.searchParams.get(key);
        if (value !== null && value !== '') preserved[key] = value;
      }
      for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);
      for (const key of Object.keys(preserved)) url.searchParams.set(key, preserved[key]);
      history.replaceState(null, '', url.toString());
      resetToPickerView();
      setTopStatus(message);
    }

    function showSavePayload(body) {
      const pre = document.getElementById('savePayload');
      const details = document.getElementById('saveDetails');
      if (pre) pre.textContent = body;
      if (details) {
        details.hidden = false;
        details.open = true;
      }
    }

    function rememberSavedEntry(body) {
      try {
        if (typeof sessionStorage === 'undefined' || !sessionStorage) return;
        sessionStorage.setItem(LAST_SAVED_KEY, body);
      } catch (e) {
        // ignore quota / private-mode failures
      }
    }

    function readRememberedEntry() {
      try {
        if (typeof sessionStorage === 'undefined' || !sessionStorage) return '';
        return sessionStorage.getItem(LAST_SAVED_KEY) || '';
      } catch (e) {
        return '';
      }
    }

    function copyText(text) {
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function'
        ) {
          const pending = navigator.clipboard.writeText(text);
          if (pending && typeof pending.catch === 'function') pending.catch(() => {});
          return true;
        }
      } catch (e) {
        // fall through to the textarea path
      }
      try {
        if (!document.body || typeof document.execCommand !== 'function') return false;
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        if (area.remove) area.remove();
        return !!ok;
      } catch (e) {
        return false;
      }
    }

    function labelControl(el, attrs) {
      if (!el || !attrs) return;
      Object.keys(attrs).forEach((key) => {
        const value = attrs[key];
        if (key === 'id') {
          el.id = value;
          return;
        }
        if (typeof el.setAttribute === 'function') el.setAttribute(key, value);
      });
    }

    // Given a comma-separated list like "12,6,4,5", return the numeric value
    // at `index` (clamped to the last entry if index is past the end), or
    // null if there isn't one. Used so quick-buttons can match up with the
    // specific set you're currently entering (set 1, set 2, ...).
    function numberAtIndex(value, index) {
      if (!value) return null;
      const parts = String(value)
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p !== '');
      if (parts.length === 0) return null;
      const i = Math.min(Math.max(index, 0), parts.length - 1);
      const n = parseFloat(parts[i]);
      return isNaN(n) ? null : n;
    }

    // How many sets have already been entered in a field, i.e. which set
    // (0-indexed) the next quick-button tap would be filling in.
    function enteredSetCount(inputId) {
      const el = document.getElementById(inputId);
      const value = el.value.trim();
      if (!value) return 0;
      return value.split(',').filter((p) => p.trim() !== '').length;
    }

    // The most recently entered value in a field (the last comma-separated
    // entry), or null if empty. Used so "what I just did" can be offered as a
    // quick-button option for the next set too.
    function mostRecentValue(inputId) {
      const el = document.getElementById(inputId);
      const value = el.value.trim();
      if (!value) return null;
      const parts = value
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p !== '');
      if (parts.length === 0) return null;
      const n = parseFloat(parts[parts.length - 1]);
      return isNaN(n) ? null : n;
    }

    // Appends a value to a comma-separated input field (same pattern as
    // "Save Time"), so quick-buttons build up "12,12,12" as you go.

    // Tracks which set indices have already (re)started the rest timer this
    // exercise. Reset to empty automatically on each page load, which happens
    // on every Prev/Next navigation (full reload).
    const timerTriggeredIndices = new Set();

    function appendQuickValue(inputId, value) {
      unlockAudio();
      const index = enteredSetCount(inputId); // index this tap is filling in
      const el = document.getElementById(inputId);
      const current = el.value.trim().replace(/,+$/, '');
      el.value = current ? `${current},${value}` : `${value}`;
      refreshQuickButtons();

      // Reps and weight at the same index are a "pair" (one set). The first
      // quick-button tap for a given index (reps[i] or weight[i], whichever
      // comes first) (re)starts the rest timer; the matching tap on the other
      // field at the same index does nothing.
      if (!timerTriggeredIndices.has(index)) {
        timerTriggeredIndices.add(index);
        resetTimer();
      }
    }

    // Renders a row of buttons around `baseValue` (previous session's value
    // for this set). Offsets are e.g. [-3,-2,-1,0,1,2,3]: 0 is `baseValue`
    // itself (highlighted). If a low-side offset would produce a value <= 0
    // (not a useful weight/reps suggestion), it's dropped and an extra slot
    // is added on the high side instead, so the total count stays the same
    // -- e.g. baseValue=5, increment=5 gives 5,10,15,20,25,30,35 with 5
    // (the previous value) highlighted but no longer centered.
    //
    // `recentValue`, if given and not already among the buttons, is appended
    // as an extra option (highlighted differently) -- e.g. if you just did 12
    // reps for the previous set (vs. 6 last time), 12 becomes an option for
    // this set too.
    function renderQuickButtons(containerId, inputId, baseValue, config, recentValue) {
      const container = document.getElementById(containerId);
      if (!container) return;
      clearElement(container);

      const results = [];

      if (baseValue !== null) {
        const targetCount = config.offsets.length;
        const queue = [...config.offsets];
        let nextOffset = Math.max(...config.offsets) + 1;

        while (results.length < targetCount && queue.length > 0) {
          const offset = queue.shift();
          const value = baseValue + offset * config.increment;

          if (value <= 0) {
            queue.push(nextOffset);
            nextOffset += 1;
            continue;
          }

          results.push({ value, isCurrent: offset === 0, isRecent: false });
        }
      }

      if (recentValue !== null && recentValue !== undefined && recentValue > 0) {
        const existing = results.find((r) => r.value === recentValue);
        if (existing) {
          existing.isRecent = true;
        } else {
          results.push({ value: recentValue, isCurrent: false, isRecent: true });
        }
      }

      results.forEach(({ value, isCurrent, isRecent }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = value;
        const kind = inputId === 'reps' ? 'reps' : 'weight';
        labelControl(btn, {
          'data-testid': inputId === 'reps' ? 'quick-reps-button' : 'quick-weights-button',
          'data-value': String(value),
          'aria-label': `${kind} ${value}`
        });
        if (isCurrent) btn.classList.add('quick-current');
        if (isRecent) btn.classList.add('quick-recent');
        btn.onclick = () => appendQuickValue(inputId, value);
        container.appendChild(btn);
      });
    }

    function clearElement(el) {
      if (!el) return;
      if (typeof el.replaceChildren === 'function') el.replaceChildren();
      else el.innerHTML = '';
    }

    function focusElement(id) {
      const el = document.getElementById(id);
      if (el && typeof el.focus === 'function') el.focus();
    }

    function setStatus(message) {
      const el = document.getElementById('status');
      if (el) el.textContent = message;
    }

    function setTopStatus(message) {
      const el = document.getElementById('topStatus');
      if (el) el.textContent = message;
    }

    // ---------------------------------------------------------------
    // Workflow: select / start / navigate
    // ---------------------------------------------------------------
    function startWorkout(workoutName) {
      const picker = document.getElementById('picker');
      if (picker) picker.hidden = true;
      const select = document.getElementById('selectWorkout');
      if (select) select.hidden = true;

      if (!url.searchParams.get('name')) {
        return getData(workoutName);
      }

      renderPage();
    }

    function isCircuitWorkout() {
      return url.searchParams.get('circuit') === '1';
    }

    function currentRoundIndex() {
      return parseInt(url.searchParams.get('currentRound') || '0', 10);
    }

    function circuitTotalRounds() {
      return parseInt(url.searchParams.get('sets') || '3', 10);
    }

    function saveCircuitState(targetUrl) {
      const currentWorkout = loadJSONQueryParameter(targetUrl.searchParams.get('currentWorkout'));
      const round = currentRoundIndex();
      const rows = document.querySelectorAll('.circuit-row');
      rows.forEach((row) => {
        const name = row.querySelector('input.circuit-name-input');
        const repsInput = row.querySelector('input.circuit-reps');
        const weightsInput = row.querySelector('input.circuit-weights');
        if (!name || !repsInput || !weightsInput) return;
        const index = parseInt(row.dataset.index, 10);
        const exercise = currentWorkout['exercises'][index];
        if (!exercise) return;

        const reps = String(repsInput.value || '').trim();
        const weights = String(weightsInput.value || '').trim();
        const nameValue = name.value.trim();
        if (nameValue) exercise['name'] = nameValue;

        const setReps = exercise['reps'] ? String(exercise['reps']).split(',') : [];
        const setWeights = exercise['weights'] ? String(exercise['weights']).split(',') : [];
        while (setReps.length <= round) setReps.push('');
        while (setWeights.length <= round) setWeights.push('');
        setReps[round] = reps;
        setWeights[round] = weights;
        exercise['reps'] = setReps.join(',');
        exercise['weights'] = setWeights.join(',');
      });

      targetUrl.searchParams.set('currentWorkout', JSON.stringify(currentWorkout));
      return currentWorkout;
    }

    function valueAtRound(exercise, field, round) {
      const values = exercise && exercise[field] ? String(exercise[field]).split(',') : [];
      return values[round] !== undefined ? String(values[round]).trim() : '';
    }

    function renderCircuitPanel() {
      const currentWorkout = loadJSONQueryParameter(url.searchParams.get('currentWorkout'));
      const previousWorkout = loadJSONQueryParameter(url.searchParams.get('previousWorkout'));
      const round = currentRoundIndex();
      const exercises = currentWorkout['exercises'] || [];
      const previousExercises = previousWorkout['exercises'] || [];
      const container = document.getElementById('circuitRounds');
      clearElement(container);

      const head = document.createElement('div');
      head.className = 'circuit-head';
      ['Exercise', 'Reps', 'Level'].forEach((text) => {
        const span = document.createElement('span');
        span.textContent = text;
        head.appendChild(span);
      });
      container.appendChild(head);

      exercises.forEach((exercise, index) => {
        const previous = previousExercises[index] || {};
        const row = document.createElement('div');
        row.className = 'circuit-row';
        row.dataset.index = index;
        const exerciseLabel = exercise['name'] || `Exercise ${index + 1}`;

        const name = document.createElement('input');
        name.type = 'text';
        name.className = 'circuit-name-input';
        name.value = exercise['name'] || '';
        name.placeholder = 'Exercise';
        labelControl(name, {
          id: `circuit-name-${index}`,
          'data-testid': 'circuit-name',
          'aria-label': `Round ${round + 1} ${exerciseLabel} name`
        });
        row.appendChild(name);

        const reps = document.createElement('input');
        reps.type = 'text';
        reps.className = 'circuit-reps';
        reps.inputMode = 'decimal';
        reps.placeholder = previous['reps']
          ? `Prev ${valueAtRound(previous, 'reps', round) || previous['reps'].split(',')[0]}`
          : 'Reps';
        reps.value = valueAtRound(exercise, 'reps', round);
        labelControl(reps, {
          id: `circuit-reps-${index}`,
          'data-testid': 'circuit-reps',
          'aria-label': `${exerciseLabel} reps for round ${round + 1}`
        });
        row.appendChild(reps);

        const weights = document.createElement('input');
        weights.type = 'text';
        weights.className = 'circuit-weights';
        weights.inputMode = 'decimal';
        weights.placeholder = previous['weights']
          ? `Prev ${valueAtRound(previous, 'weights', round) || previous['weights'].split(',')[0]}`
          : 'Level';
        weights.value = valueAtRound(exercise, 'weights', round);
        labelControl(weights, {
          id: `circuit-weights-${index}`,
          'data-testid': 'circuit-weights',
          'aria-label': `${exerciseLabel} level for round ${round + 1}`
        });
        row.appendChild(weights);

        container.appendChild(row);
      });

      const total = circuitTotalRounds();
      document.getElementById('exerciseCount').textContent = `Round ${round + 1} / ${total}`;
      document.getElementById('circuitPrevBtn').disabled = round <= 0;
      document.getElementById('circuitNextBtn').disabled = round >= total - 1;
    }

    function circuitNextRound() {
      saveCircuitState(url);
      const round = currentRoundIndex();
      const max = circuitTotalRounds() - 1;
      let advanced = false;
      if (round < max) {
        url.searchParams.set('currentRound', String(round + 1));
        advanced = true;
      }
      // renderPage() clears any running timer, so start the round rest
      // timer after the re-render. The on-screen legend says the timer
      // starts when a round is finished.
      reloadPage(url);
      if (advanced) resetTimer();
    }

    function circuitPrevRound() {
      saveCircuitState(url);
      const round = currentRoundIndex();
      if (round > 0) {
        url.searchParams.set('currentRound', String(round - 1));
      }
      reloadPage(url);
    }

    function dismissWaterBanner() {
      const banner = document.getElementById('circuitWaterBanner');
      if (banner) banner.classList.remove('visible');
    }

    function saveExerciseData(targetUrl, reload = false) {
      const currentWorkout = loadJSONQueryParameter(targetUrl.searchParams.get('currentWorkout'));
      const currentExerciseId = parseInt(targetUrl.searchParams.get('currentExerciseId'));

      const reps = document.getElementById('reps').value;
      const weights = document.getElementById('weights').value;
      const times = document.getElementById('times').value;
      const currentExerciseName = document.getElementById('currentExerciseName').value;

      currentWorkout['exercises'][currentExerciseId]['name'] = currentExerciseName;
      currentWorkout['exercises'][currentExerciseId]['reps'] = reps;
      currentWorkout['exercises'][currentExerciseId]['weights'] = weights;
      currentWorkout['exercises'][currentExerciseId]['times'] = times;

      targetUrl.searchParams.set('currentWorkout', JSON.stringify(currentWorkout));

      if (reload) {
        reloadPage(targetUrl);
      }

      return currentWorkout;
    }

    function nextExercise() {
      const currentWorkout = loadJSONQueryParameter(url.searchParams.get('currentWorkout'));
      const currentExerciseId = parseInt(url.searchParams.get('currentExerciseId'));
      const currentExercisesMaxIndex = currentWorkout['exercises'].length - 1;

      saveExerciseData(url);

      if (currentExerciseId + 1 > currentExercisesMaxIndex) {
        const updatedWorkout = loadJSONQueryParameter(url.searchParams.get('currentWorkout'));
        updatedWorkout['exercises'].push({
          name: '',
          reps: '',
          weights: '',
          times: ''
        });
        url.searchParams.set('currentWorkout', JSON.stringify(updatedWorkout));
      }

      url.searchParams.set('currentExerciseId', String(currentExerciseId + 1));
      reloadPage(url);
    }

    function prevExercise() {
      const currentExerciseId = parseInt(url.searchParams.get('currentExerciseId'));

      if (currentExerciseId == 0) {
        return;
      }

      saveExerciseData(url);
      url.searchParams.set('currentExerciseId', String(currentExerciseId - 1));
      reloadPage(url);
    }

    // ---------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------
    function renderPage() {
      // Since navigation between exercises no longer reloads the page (see
      // reloadPage), reset per-exercise state that previously got a clean
      // slate "for free" from a full reload: any running rest timer, the
      // set of indices that have already triggered it, and the previous
      // exercise's duration-update interval.
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = '';
      }
      currentTimer = 0;
      currentTimerStart = null;
      const timerEl = document.getElementById('timer');
      if (timerEl) timerEl.textContent = '';
      timerTriggeredIndices.clear();

      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }

      const name = url.searchParams.get('name');
      let previousWorkout;
      let currentWorkout;
      try {
        previousWorkout = loadJSONQueryParameter(url.searchParams.get('previousWorkout'));
        currentWorkout = loadJSONQueryParameter(url.searchParams.get('currentWorkout'));
        if (!previousWorkout || !currentWorkout || !Array.isArray(currentWorkout.exercises)) {
          throw new Error('Incomplete workout state');
        }
        if (!Array.isArray(previousWorkout.exercises)) previousWorkout.exercises = [];
      } catch (e) {
        console.warn('Could not read workout state', e);
        fallbackToPicker('Could not read the saved workout. Choose a routine to start fresh.');
        return;
      }

      const currentExerciseId = parseInt(url.searchParams.get('currentExerciseId') || '0', 10);
      const circuit = isCircuitWorkout();
      const workoutEl = document.getElementById('workout');
      if (workoutEl) workoutEl.hidden = false;
      const picker = document.getElementById('picker');
      if (picker) picker.hidden = true;
      const linearView = document.getElementById('linearView');
      const circuitView = document.getElementById('circuitView');
      if (linearView) linearView.hidden = circuit;
      if (circuitView) circuitView.hidden = !circuit;

      const previousWorkoutDuration = calculateLastWorkoutDuration(
        Math.max(
          0,
          (previousWorkout['endMilliseconds'] || 0) - (previousWorkout['startMilliseconds'] || 0)
        )
      );
      document.getElementById('workoutName').textContent = name || '';
      document.getElementById('workoutLastCompleted').textContent = formatLastCompleted(
        previousWorkout['endMilliseconds']
      );
      document.getElementById('workoutLastDuration').textContent =
        `Last Time: ${previousWorkoutDuration[0]}m ${previousWorkoutDuration[1]}s`;
      setCurrentWorkoutDuration(currentWorkout);
      durationInterval = setInterval(() => {
        setCurrentWorkoutDuration(currentWorkout);
      }, 500);
      setTopStatus('');

      if (circuit) {
        renderCircuitPanel();
        syncEditPanel();
        updateWorkoutTitle(name);
        syncWebMcpTools();
        return;
      }

      const previousExercises = previousWorkout['exercises'];
      let previousExercise;
      if (currentExerciseId <= previousExercises.length - 1) {
        previousExercise = previousExercises[currentExerciseId];
      } else {
        previousExercise = {
          name: '-',
          reps: '-',
          weights: '-',
          times: '-'
        };
      }

      const currentExercises = currentWorkout['exercises'];
      const currentExercise = currentExercises[currentExerciseId] || {
        name: '',
        reps: '',
        weights: '',
        times: ''
      };

      document.getElementById('exerciseCount').textContent =
        `${currentExerciseId + 1} / ${currentExercises.length}`;
      const prevBtn = document.getElementById('prevExerciseBtn');
      if (prevBtn) prevBtn.disabled = currentExerciseId === 0;

      document.getElementById('currentExerciseName').value = currentExercise['name'] || '';
      document.getElementById('previousWorkoutExerciseReps').textContent =
        `Reps: ${previousExercise['reps'] || '-'}`;
      document.getElementById('previousWorkoutExerciseWeights').textContent =
        `Weight: ${previousExercise['weights'] || '-'}`;
      document.getElementById('previousWorkoutExerciseTimes').textContent = previousExercise[
        'times'
      ]
        ? `Time: ${previousExercise['times']}`
        : '';

      document.getElementById('reps').value = currentExercise['reps'] || '';
      document.getElementById('weights').value = currentExercise['weights'] || '';
      document.getElementById('times').value = currentExercise['times'] || '';

      refreshQuickButtons();
      syncEditPanel();
      updateWorkoutTitle(name);
      syncWebMcpTools();
    }

    function selectWorkout() {
      const selected = document.getElementById('selectWorkout').value;
      if (!selected || selected === 'Choose a workout') return;
      startWorkout(selected);
    }

    // Re-renders just the quick-increment buttons for the current exercise,
    // using whatever increments are currently in QUICK_BUTTON_CONFIG. Used
    // after changing settings, without re-running all of renderPage (which
    // would stack up duplicate setInterval timers).
    // Re-renders the quick-increment buttons for the current exercise, based
    // on how many sets have already been entered: set 1 in progress -> use
    // previous session's set 1 value, set 2 -> set 2 value, etc. (clamped to
    // the previous session's last set if you go further than it did).
    function refreshQuickButtons() {
      const previousWorkout = loadJSONQueryParameter(url.searchParams.get('previousWorkout'));
      const currentExerciseId = parseInt(url.searchParams.get('currentExerciseId'));
      if (isCircuitWorkout()) {
        return;
      }
      const previousExercises = previousWorkout['exercises'];
      const previousExercise =
        currentExerciseId <= previousExercises.length - 1
          ? previousExercises[currentExerciseId]
          : {};

      const repsIndex = enteredSetCount('reps');
      const weightsIndex = enteredSetCount('weights');

      renderQuickButtons(
        'repsQuick',
        'reps',
        numberAtIndex(previousExercise['reps'], repsIndex),
        QUICK_BUTTON_CONFIG.reps,
        mostRecentValue('reps')
      );
      renderQuickButtons(
        'weightsQuick',
        'weights',
        numberAtIndex(previousExercise['weights'], weightsIndex),
        QUICK_BUTTON_CONFIG.weights,
        mostRecentValue('weights')
      );
    }

    // ---------------------------------------------------------------
    // Edit mode: lets you change defaults (quick-button increments, rest
    // timer length) on the fly. Saved into the URL's query parameters so
    // they survive a page reload/bookmark.
    // ---------------------------------------------------------------
    function syncEditPanel() {
      const panel = document.getElementById('editPanel');
      const main = document.getElementById('mainContent');
      if (!panel || !main) return;
      const open = url.searchParams.get('settings') === '1';
      if (open) {
        const s = getSettings();
        const weight = document.getElementById('cfgWeightInc');
        const reps = document.getElementById('cfgRepsInc');
        const timer = document.getElementById('cfgTimerDefault');
        if (weight) weight.value = s.weightInc;
        if (reps) reps.value = s.repsInc;
        if (timer) timer.value = s.timerDefault;
      }
      panel.hidden = !open;
      main.hidden = open;
    }

    function toggleEditMode() {
      const opening = url.searchParams.get('settings') !== '1';
      if (opening) url.searchParams.set('settings', '1');
      else url.searchParams.delete('settings');
      history.replaceState(null, '', url.toString());
      syncEditPanel();
      updateWorkoutTitle(url.searchParams.get('name'));
      syncWebMcpTools();
      if (opening) focusElement('cfgWeightInc');
      else focusElement('editToggle');
    }

    function applyEditPanel() {
      const weightInc =
        parseFloat(document.getElementById('cfgWeightInc').value) || SETTINGS_DEFAULTS.weightInc;
      const repsInc =
        parseFloat(document.getElementById('cfgRepsInc').value) || SETTINGS_DEFAULTS.repsInc;
      const timerDefault =
        parseInt(document.getElementById('cfgTimerDefault').value, 10) ||
        SETTINGS_DEFAULTS.timerDefault;

      url.searchParams.set('weightInc', String(weightInc));
      url.searchParams.set('repsInc', String(repsInc));
      url.searchParams.set('timerDefault', String(timerDefault));
      history.replaceState(null, '', url);

      applySettings();
      refreshQuickButtons();
      toggleEditMode();
    }

    // Returns to the workout-picker screen. Keeps email and the quick-button
    // / timer settings so a bookmark's preferences survive Home. Confirms
    // first so an accidental tap doesn't lose progress.
    function goHome() {
      const confirmed = confirm(
        'Go back to the home screen? This will discard the workout in progress.'
      );
      if (!confirmed) return;
      discardWorkout();
    }

    function discardWorkout() {
      // Stop any running timers/intervals from the in-progress workout.
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = '';
      }
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }
      currentTimer = 0;
      currentTimerStart = null;

      const keep = ['email', 'weightInc', 'repsInc', 'timerDefault'];
      const preserved = {};
      for (const key of keep) {
        const value = url.searchParams.get(key);
        if (value !== null && value !== '') preserved[key] = value;
      }
      for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);
      for (const key of Object.keys(preserved)) url.searchParams.set(key, preserved[key]);

      // Update the URL without a full navigation (see reloadPage) so this
      // works even with no connectivity.
      history.pushState(null, '', url.toString());
      clearInProgressState();
      resetToPickerView();
      setTopStatus('Workout discarded. Choose a routine to start a new one.');
      focusElement('selectWorkout');
    }

    // Returns the UI to the routine-picker state without reloading the page.
    function resetToPickerView() {
      const workout = document.getElementById('workout');
      if (workout) workout.hidden = true;
      const picker = document.getElementById('picker');
      if (picker) picker.hidden = false;
      setDocumentTitle('Workout Tracker');
      setTopStatus('');

      const select = document.getElementById('selectWorkout');
      if (!select) return;
      select.hidden = false;
      select.selectedIndex = 0;

      // If we landed here via a direct "in progress workout" link, the
      // picker may never have been populated.
      if (!select.options || select.options.length <= 1) {
        loadWorkoutOptions();
      }
      syncWebMcpTools();
    }

    // ---------------------------------------------------------------
    // Timer
    // ---------------------------------------------------------------
    function saveTime() {
      let times = document.getElementById('times').value;
      let timeValue = currentTimerStart
        ? `${Math.floor((Date.now() - currentTimerStart) / 1000)}`
        : `${Math.floor(currentTimer)}`;

      if (timeValue == '0') {
        return;
      }

      if (times) {
        timeValue = `${times},${timeValue}`;
      }

      document.getElementById('times').value = timeValue;
    }

    function resetTimer() {
      // Create/resume the audio context here, while we're inside a user
      // gesture, so the later beep() call from setInterval is allowed to play.
      try {
        ensureAudioCtx();
      } catch (e) {
        console.warn('audio context unavailable', e);
      }

      const waterBanner = document.getElementById('circuitWaterBanner');
      if (waterBanner && waterBanner.classList) waterBanner.classList.remove('visible');

      let durationSeconds = DEFAULT_TIMER_DURATION;
      if (!isCircuitWorkout()) {
        try {
          const currentExerciseId = url.searchParams.get('currentExerciseId');
          const currentWorkout = loadJSONQueryParameter(url.searchParams.get('currentWorkout'));
          const exercise = currentWorkout.exercises[currentExerciseId];
          durationSeconds = (exercise && exercise.timer_duration) || DEFAULT_TIMER_DURATION;
        } catch (e) {
          durationSeconds = DEFAULT_TIMER_DURATION;
        }
      }
      const startedAt = new Date().getTime();

      currentTimer = 0;
      currentTimerStart = startedAt;
      const timeSpan = document.getElementById('timer');
      const deadline = durationSeconds * 1000 + startedAt;

      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = '';
      }

      const showRemaining = (distance) => {
        const minutes = Math.floor(distance / 60000);
        const secs = Math.floor((distance % 60000) / 1000);
        if (timeSpan) timeSpan.textContent = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
      };

      const finishTimer = () => {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = '';
        }
        if (timeSpan) timeSpan.textContent = '0s';
        beep();
        if (isCircuitWorkout()) {
          const banner = document.getElementById('circuitWaterBanner');
          if (banner && banner.classList) banner.classList.add('visible');
        }
        setStatus('Rest timer finished.');
      };

      if (durationSeconds <= 0) {
        finishTimer();
        return;
      }

      showRemaining(durationSeconds * 1000);
      timerInterval = setInterval(() => {
        const distance = deadline - new Date().getTime();
        currentTimer += 0.5;
        if (distance <= 0) {
          finishTimer();
          return;
        }
        showRemaining(distance);
      }, 500);
    }

    // ---------------------------------------------------------------
    // Save workout: draft an email with just today's entry (not the
    // whole file) plus a link to edit the routine on GitHub. Open the
    // email, paste the entry into the "workouts" array, commit.
    //
    // Add ?email=you@example.com to the URL (and bookmark/save that
    // link) so your address isn't stored anywhere in this file.
    // ---------------------------------------------------------------
    function saveWorkout() {
      let currentWorkout;
      try {
        currentWorkout = isCircuitWorkout() ? saveCircuitState(url) : saveExerciseData(url, false);
      } catch (e) {
        console.warn('Could not read workout to save', e);
        setStatus('Could not read this workout, so nothing was saved.');
        return;
      }
      currentWorkout['endMilliseconds'] = getTimeMillisecondsDate();
      currentWorkout['exercises'] = (currentWorkout['exercises'] || []).filter(
        (exercise) => exercise && exercise['name']
      );

      url.searchParams.set('currentWorkout', JSON.stringify(currentWorkout));
      history.replaceState(null, '', url);
      clearInProgressState();

      const file = url.searchParams.get('file');
      const name = url.searchParams.get('name');
      const email = (url.searchParams.get('email') || '').trim();

      const editUrl = `https://github.com/${GH_OWNER}/${GH_REPO}/edit/${GH_BRANCH}/src/workouts/${file}`;

      const subject = `Workout - ${name}`;
      const formatEasternTime = (ms) =>
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZoneName: 'short'
        }).format(new Date(ms));
      const startTime = formatEasternTime(currentWorkout.startMilliseconds);
      const endTime = formatEasternTime(currentWorkout.endMilliseconds);
      const whoopLine = `Add to activities, start time: ${startTime}, end time: ${endTime}, activity: weightlifting`;
      const body =
        `${whoopLine}\n\n` +
        `// ${name} - ${formatEasternTime(currentWorkout.startMilliseconds)}\n` +
        `// Open: ${editUrl}\n` +
        `// Scroll to the end of the "workouts" array (just before its closing ]) and paste this entire block right before that ]\n` +
        `,${JSON.stringify(currentWorkout)}`;

      showSavePayload(body);
      rememberSavedEntry(body);
      const copied = copyText(body);

      if (!email) {
        setStatus(
          copied
            ? 'No ?email= address is set, so no email draft was opened. The workout entry was copied to the clipboard and is shown below. Add ?email=you@example.com to your bookmark to draft an email next time.'
            : 'No ?email= address is set, and the workout entry could not be copied automatically. Copy the entry shown below, or add ?email=you@example.com to your bookmark.'
        );
        return;
      }

      const a = document.createElement('a');
      a.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (typeof a.click === 'function') a.click();

      setStatus(
        copied
          ? 'Email drafted, and the workout entry was copied to the clipboard. Paste it into the routine file on GitHub if the draft does not open.'
          : 'Email drafted. Open it, then paste the entry into GitHub. The entry is also shown below.'
      );
    }

    // ---------------------------------------------------------------
    // WebMCP (progressive enhancement). Browsers without
    // document.modelContext.registerTool ignore this entirely.
    // ---------------------------------------------------------------
    let webMcpController = null;
    let webMcpMode = '';

    function webMcpAvailable() {
      return (
        typeof document !== 'undefined' &&
        document.modelContext &&
        typeof document.modelContext.registerTool === 'function' &&
        typeof AbortController === 'function'
      );
    }

    function workoutView() {
      const workout = document.getElementById('workout');
      if (!url.searchParams.get('currentWorkout') || (workout && workout.hidden)) return 'picker';
      return isCircuitWorkout() ? 'circuit' : 'linear';
    }

    function routineChoices() {
      const select = document.getElementById('selectWorkout');
      if (!select || !select.options) return [];
      const options = Array.isArray(select.options) ? select.options : Array.from(select.options);
      return options
        .filter((option) => option && option.value)
        .map((option) => ({ file: option.value, name: option.textContent || option.value }));
    }

    function readWorkoutState() {
      const view = workoutView();
      const settings = getSettings();
      const state = {
        view: url.searchParams.get('settings') === '1' && view !== 'picker' ? 'settings' : view,
        routineName: url.searchParams.get('name') || '',
        file: url.searchParams.get('file') || '',
        email: url.searchParams.get('email') || '',
        settings: settings,
        routines: routineChoices()
      };
      if (view === 'linear') {
        const id = parseInt(url.searchParams.get('currentExerciseId') || '0', 10);
        state.exercise = {
          index: id,
          totalText: (document.getElementById('exerciseCount') || {}).textContent || '',
          name: (document.getElementById('currentExerciseName') || {}).value || '',
          reps: (document.getElementById('reps') || {}).value || '',
          weights: (document.getElementById('weights') || {}).value || '',
          times: (document.getElementById('times') || {}).value || ''
        };
      }
      if (view === 'circuit') {
        state.round = { index: currentRoundIndex(), total: circuitTotalRounds() };
      }
      return state;
    }

    function toolError(message) {
      return { error: message };
    }

    function requireString(value, label) {
      if (typeof value !== 'string') return toolError(`${label} must be a string.`);
      return null;
    }

    function webMcpTools(mode) {
      const read = {
        name: 'read-workout-state',
        description:
          'Read the open workout, the current exercise or circuit round, settings, and the routine names in the picker.',
        inputSchema: { type: 'object', properties: {} },
        execute(_input, agent) {
          if (agent && agent.signal && agent.signal.aborted) return toolError('Cancelled.');
          return readWorkoutState();
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true }
      };
      const choose = {
        name: 'choose-routine',
        description:
          'Start a routine from the picker. Pass the routine file name, such as stretch.json.',
        inputSchema: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              description: 'Routine filename from read-workout-state routines[].file.'
            }
          },
          required: ['file']
        },
        execute(input, agent) {
          if (agent && agent.signal && agent.signal.aborted) return toolError('Cancelled.');
          const typeError = requireString(input && input.file, 'file');
          if (typeError) return typeError;
          const match = routineChoices().find((routine) => routine.file === input.file);
          if (!match) {
            return toolError(
              `No routine file "${input.file}". Read read-workout-state and use one of routines[].file.`
            );
          }
          const select = document.getElementById('selectWorkout');
          select.value = input.file;
          startWorkout(input.file);
          return { started: true, file: input.file, name: match.name };
        },
        annotations: { readOnlyHint: false }
      };
      const logExercise = {
        name: 'log-current-exercise',
        description:
          'Write the current linear exercise. Pass any of name, reps, weights, or times as comma-separated strings, such as reps "12,10".',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Exercise name.' },
            reps: { type: 'string', description: 'Comma-separated reps, such as "12,10".' },
            weights: { type: 'string', description: 'Comma-separated weights, such as "20,25".' },
            times: { type: 'string', description: 'Comma-separated seconds, such as "90,60".' }
          }
        },
        execute(input, agent) {
          if (agent && agent.signal && agent.signal.aborted) return toolError('Cancelled.');
          if (workoutView() !== 'linear')
            return toolError(
              'A linear exercise is not on screen. Use log-circuit-round during a circuit.'
            );
          const fields = ['name', 'reps', 'weights', 'times'];
          const provided = fields.filter((field) => input && input[field] != null);
          if (provided.length === 0) return toolError('Pass name, reps, weights, or times.');
          for (const field of provided) {
            const typeError = requireString(input[field], field);
            if (typeError) return typeError;
          }
          if (input.name != null) document.getElementById('currentExerciseName').value = input.name;
          if (input.reps != null) document.getElementById('reps').value = input.reps;
          if (input.weights != null) document.getElementById('weights').value = input.weights;
          if (input.times != null) document.getElementById('times').value = input.times;
          persistCurrentState();
          refreshQuickButtons();
          return readWorkoutState();
        },
        annotations: { readOnlyHint: false }
      };
      const logRound = {
        name: 'log-circuit-round',
        description:
          'Write one exercise on the current circuit round. exerciseIndex is 0-based. reps and level are the values for this round only.',
        inputSchema: {
          type: 'object',
          properties: {
            exerciseIndex: { type: 'number', description: '0-based index of the exercise row.' },
            name: { type: 'string', description: 'Exercise name.' },
            reps: { type: 'string', description: 'Reps for this round.' },
            level: { type: 'string', description: 'Weight or machine level for this round.' }
          },
          required: ['exerciseIndex']
        },
        execute(input, agent) {
          if (agent && agent.signal && agent.signal.aborted) return toolError('Cancelled.');
          if (workoutView() !== 'circuit') return toolError('A circuit round is not on screen.');
          if (
            !input ||
            typeof input.exerciseIndex !== 'number' ||
            !Number.isInteger(input.exerciseIndex)
          ) {
            return toolError('exerciseIndex must be an integer starting at 0.');
          }
          const rows = document.querySelectorAll('.circuit-row');
          const row = rows[input.exerciseIndex];
          if (!row) return toolError(`No circuit row at index ${input.exerciseIndex}.`);
          const name = row.querySelector('input.circuit-name-input');
          const reps = row.querySelector('input.circuit-reps');
          const weights = row.querySelector('input.circuit-weights');
          if (input.name != null) {
            const typeError = requireString(input.name, 'name');
            if (typeError) return typeError;
            if (name) name.value = input.name;
          }
          if (input.reps != null) {
            const typeError = requireString(input.reps, 'reps');
            if (typeError) return typeError;
            if (reps) reps.value = input.reps;
          }
          if (input.level != null) {
            const typeError = requireString(input.level, 'level');
            if (typeError) return typeError;
            if (weights) weights.value = input.level;
          }
          if (input.name == null && input.reps == null && input.level == null) {
            return toolError('Pass name, reps, or level to write.');
          }
          saveCircuitState(url);
          saveInProgressState();
          return readWorkoutState();
        },
        annotations: { readOnlyHint: false }
      };
      function stepTool(name, description, run) {
        return {
          name: name,
          description: description,
          inputSchema: { type: 'object', properties: {} },
          execute(_input, agent) {
            if (agent && agent.signal && agent.signal.aborted) return toolError('Cancelled.');
            const error = run();
            if (error) return error;
            return readWorkoutState();
          },
          annotations: { readOnlyHint: false }
        };
      }
      const nextExerciseTool = stepTool(
        'go-to-next-exercise',
        'Save the current linear exercise and show the next one.',
        () => {
          if (workoutView() !== 'linear')
            return toolError('Next exercise is available in a linear workout.');
          nextExercise();
          return null;
        }
      );
      const prevExerciseTool = stepTool(
        'go-to-previous-exercise',
        'Save the current linear exercise and show the previous one.',
        () => {
          if (workoutView() !== 'linear')
            return toolError('Previous exercise is available in a linear workout.');
          const before = url.searchParams.get('currentExerciseId');
          prevExercise();
          if (before === '0') return toolError('Already on the first exercise.');
          return null;
        }
      );
      const nextRoundTool = stepTool(
        'go-to-next-round',
        'Save this circuit round, show the next round, and start the rest timer.',
        () => {
          if (workoutView() !== 'circuit')
            return toolError('Next round is available during a circuit.');
          const before = currentRoundIndex();
          circuitNextRound();
          if (currentRoundIndex() === before) return toolError('Already on the last round.');
          return null;
        }
      );
      const prevRoundTool = stepTool(
        'go-to-previous-round',
        'Save this circuit round and show the previous round.',
        () => {
          if (workoutView() !== 'circuit')
            return toolError('Previous round is available during a circuit.');
          const before = currentRoundIndex();
          circuitPrevRound();
          if (currentRoundIndex() === before) return toolError('Already on the first round.');
          return null;
        }
      );
      const timerTool = stepTool(
        'start-rest-timer',
        'Start or restart the rest timer for the current exercise or circuit round.',
        () => {
          if (workoutView() === 'picker')
            return toolError('Start a routine before starting the rest timer.');
          resetTimer();
          return null;
        }
      );
      const saveTool = {
        name: 'save-workout',
        description:
          'Finish the open workout, copy the paste block, and draft an email when an email address is in the URL.',
        inputSchema: { type: 'object', properties: {} },
        execute(_input, agent) {
          if (agent && agent.signal && agent.signal.aborted) return toolError('Cancelled.');
          if (workoutView() === 'picker') return toolError('There is no workout to save.');
          saveWorkout();
          return {
            saved: true,
            status: (document.getElementById('status') || {}).textContent || ''
          };
        },
        annotations: { readOnlyHint: false, consequentialHint: true }
      };
      const discardTool = {
        name: 'discard-workout',
        description:
          'Leave the open workout and return to the routine picker. The in-progress log is removed.',
        inputSchema: {
          type: 'object',
          properties: {
            confirmed: {
              type: 'boolean',
              description: 'Must be true. This removes the in-progress workout.'
            }
          },
          required: ['confirmed']
        },
        execute(input, agent) {
          if (agent && agent.signal && agent.signal.aborted) return toolError('Cancelled.');
          if (workoutView() === 'picker') return toolError('There is no workout to discard.');
          if (!input || input.confirmed !== true) {
            return toolError('Pass confirmed: true to discard the in-progress workout.');
          }
          discardWorkout();
          return { discarded: true, view: 'picker' };
        },
        annotations: { readOnlyHint: false, consequentialHint: true }
      };
      const settingsTool = {
        name: 'update-settings',
        description:
          'Set the weight increment, reps increment, and default rest timer in seconds. Values are kept in the URL.',
        inputSchema: {
          type: 'object',
          properties: {
            weightInc: { type: 'number', description: 'Weight quick-button step, greater than 0.' },
            repsInc: { type: 'number', description: 'Reps quick-button step, greater than 0.' },
            timerDefault: {
              type: 'number',
              description: 'Default rest timer in whole seconds, greater than 0.'
            }
          }
        },
        execute(input, agent) {
          if (agent && agent.signal && agent.signal.aborted) return toolError('Cancelled.');
          if (!input) return toolError('Pass weightInc, repsInc, or timerDefault.');
          const next = getSettings();
          if (input.weightInc != null) {
            if (typeof input.weightInc !== 'number' || !(input.weightInc > 0))
              return toolError('weightInc must be a number greater than 0.');
            next.weightInc = input.weightInc;
          }
          if (input.repsInc != null) {
            if (typeof input.repsInc !== 'number' || !(input.repsInc > 0))
              return toolError('repsInc must be a number greater than 0.');
            next.repsInc = input.repsInc;
          }
          if (input.timerDefault != null) {
            if (
              typeof input.timerDefault !== 'number' ||
              !Number.isInteger(input.timerDefault) ||
              input.timerDefault <= 0
            ) {
              return toolError('timerDefault must be a whole number of seconds greater than 0.');
            }
            next.timerDefault = input.timerDefault;
          }
          if (input.weightInc == null && input.repsInc == null && input.timerDefault == null) {
            return toolError('Pass weightInc, repsInc, or timerDefault.');
          }
          url.searchParams.set('weightInc', String(next.weightInc));
          url.searchParams.set('repsInc', String(next.repsInc));
          url.searchParams.set('timerDefault', String(next.timerDefault));
          history.replaceState(null, '', url.toString());
          applySettings();
          if (workoutView() === 'linear') refreshQuickButtons();
          saveInProgressState();
          return { settings: getSettings() };
        },
        annotations: { readOnlyHint: false }
      };
      if (mode === 'picker') return [read, choose];
      if (mode === 'circuit') {
        return [
          read,
          logRound,
          nextRoundTool,
          prevRoundTool,
          timerTool,
          saveTool,
          discardTool,
          settingsTool
        ];
      }
      return [
        read,
        logExercise,
        nextExerciseTool,
        prevExerciseTool,
        timerTool,
        saveTool,
        discardTool,
        settingsTool
      ];
    }

    function syncWebMcpTools() {
      try {
        if (!webMcpAvailable()) return;
        const mode = workoutView();
        if (mode === webMcpMode && webMcpController) return;
        if (webMcpController) webMcpController.abort();
        webMcpController = new AbortController();
        webMcpMode = mode;
        const signal = webMcpController.signal;
        webMcpTools(mode).forEach((tool) => {
          const pending = document.modelContext.registerTool(tool, { signal });
          if (pending && typeof pending.catch === 'function') pending.catch(() => {});
        });
      } catch (e) {
        console.warn('WebMCP registration failed', e);
      }
    }

    // ---------------------------------------------------------------
    // Boot
    // ---------------------------------------------------------------
    document.getElementById('reps').addEventListener('input', () => {
      refreshQuickButtons();
      persistCurrentState();
    });
    document.getElementById('weights').addEventListener('input', () => {
      refreshQuickButtons();
      persistCurrentState();
    });
    document.getElementById('times').addEventListener('input', persistCurrentState);
    document.getElementById('currentExerciseName').addEventListener('input', persistCurrentState);
    document.addEventListener('input', (e) => {
      if (e.target && e.target.closest && e.target.closest('#circuitView')) {
        saveCircuitState(url);
        persistCurrentState();
      }
    });

    function stateIsResumable(state) {
      if (!state || !state.name || !state.currentWorkout || !state.previousWorkout) return false;
      if (isFinishedWorkout(state.currentWorkout)) return false;
      try {
        const current = loadJSONQueryParameter(state.currentWorkout);
        const previous = loadJSONQueryParameter(state.previousWorkout);
        return !!(current && previous && Array.isArray(current.exercises));
      } catch (e) {
        return false;
      }
    }

    let savedState = loadInProgressState();
    if (savedState && !stateIsResumable(savedState)) {
      clearInProgressState();
      savedState = null;
    }
    const urlName = url.searchParams.get('name');
    const urlFile = url.searchParams.get('file');
    const urlResumable = stateIsResumable({
      name: urlName,
      currentWorkout: url.searchParams.get('currentWorkout'),
      previousWorkout: url.searchParams.get('previousWorkout')
    });

    try {
      if (savedState && (!urlName || savedState.file === urlFile)) {
        // Prefer the localStorage backup: it's always at least as recent as
        // whatever URL the browser actually loaded. A reload is a real network
        // request for the current URL+querystring; if offline, the browser may
        // fall back to an older cached URL from earlier in this same session
        // (same routine), which would otherwise show stale progress.
        for (const field of IN_PROGRESS_FIELDS) {
          if (
            savedState[field] !== null &&
            savedState[field] !== undefined &&
            savedState[field] !== ''
          ) {
            url.searchParams.set(field, savedState[field]);
          }
        }
        // Settings were applied from the URL before this restore. Re-apply so a
        // backup that carries weightInc/repsInc/timerDefault actually takes effect.
        applySettings();
        history.replaceState(null, '', url.toString());

        setTimeout(function () {
          try {
            startWorkout(savedState.name);
          } catch (e) {
            fallbackToPicker(
              'Could not restore the in-progress workout. Choose a routine to start fresh.'
            );
          }
        }, 0);
      } else if (urlName && isFinishedWorkout(url.searchParams.get('currentWorkout'))) {
        const remembered = readRememberedEntry() || url.searchParams.get('currentWorkout') || '';
        clearInProgressState();
        fallbackToPicker('This workout was already saved. Choose a routine to start a new one.');
        if (remembered) showSavePayload(remembered);
      } else if (urlName && !urlResumable) {
        fallbackToPicker(
          'Could not read the saved workout in the link. Choose a routine to start fresh.'
        );
      } else if (urlName) {
        setTimeout(function () {
          try {
            startWorkout(urlName);
          } catch (e) {
            fallbackToPicker('Could not open that workout. Choose a routine to start fresh.');
          }
        }, 0);
      } else {
        loadWorkoutOptions();
        const remembered = readRememberedEntry();
        if (remembered) showSavePayload(remembered);
      }
    } catch (e) {
      console.warn('Boot failed', e);
      fallbackToPicker('Could not read the saved workout. Choose a routine to start fresh.');
    }
    syncWebMcpTools();

    root.url = url;
    const exported = {
      getSettings,
      applySettings,
      ensureAudioCtx,
      unlockAudio,
      beep,
      beepTone,
      parseJsonWithComments,
      decodeQueryParam,
      getTimeMillisecondsDate,
      reloadPage,
      saveInProgressState,
      loadInProgressState,
      clearInProgressState,
      persistCurrentState,
      loadJSONQueryParameter,
      isFinishedWorkout,
      calculateLastWorkoutDuration,
      calulateDaysAgo,
      setCurrentWorkoutDuration,
      formatLastCompleted,
      setDocumentTitle,
      updateWorkoutTitle,
      showPicker,
      fallbackToPicker,
      showSavePayload,
      rememberSavedEntry,
      readRememberedEntry,
      copyText,
      labelControl,
      numberAtIndex,
      enteredSetCount,
      mostRecentValue,
      appendQuickValue,
      renderQuickButtons,
      clearElement,
      focusElement,
      setStatus,
      setTopStatus,
      startWorkout,
      isCircuitWorkout,
      currentRoundIndex,
      circuitTotalRounds,
      saveCircuitState,
      valueAtRound,
      renderCircuitPanel,
      circuitNextRound,
      circuitPrevRound,
      dismissWaterBanner,
      saveExerciseData,
      nextExercise,
      prevExercise,
      renderPage,
      selectWorkout,
      refreshQuickButtons,
      syncEditPanel,
      toggleEditMode,
      applyEditPanel,
      goHome,
      discardWorkout,
      resetToPickerView,
      saveTime,
      resetTimer,
      saveWorkout,
      webMcpAvailable,
      workoutView,
      routineChoices,
      readWorkoutState,
      toolError,
      requireString,
      webMcpTools,
      syncWebMcpTools,
      stateIsResumable,
      loadWorkoutOptions,
      getData
    };
    Object.assign(root, exported);
    return exported;
  }

  return { install: install };
});
