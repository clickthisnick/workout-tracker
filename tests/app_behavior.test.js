const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function session(previousExercises, currentExercises, extra) {
  const previous = {
    startMilliseconds: 1,
    endMilliseconds: 1000,
    exercises: previousExercises
  };
  const current = {
    startMilliseconds: 1_700_000_000_000,
    endMilliseconds: 0,
    exercises: currentExercises
  };
  const params = new URLSearchParams();
  params.set('name', 'Arms');
  params.set('file', 'home_cable_arm.json');
  params.set('circuit', '0');
  params.set('sets', '3');
  params.set('currentExerciseId', '0');
  params.set('currentRound', '0');
  params.set('previousWorkout', JSON.stringify(previous));
  params.set('currentWorkout', JSON.stringify(current));
  params.set('email', 'me@example.com');
  params.set('weightInc', '5');
  params.set('repsInc', '1');
  params.set('timerDefault', '90');
  if (extra) {
    Object.keys(extra).forEach((key) => {
      if (extra[key] == null) params.delete(key);
      else params.set(key, String(extra[key]));
    });
  }
  return params.toString();
}

function boot(search, options) {
  const opts = options || {};
  const storageMap = new Map(Object.entries(opts.storage || {}));
  const storage = {
    getItem(key) { return storageMap.has(key) ? storageMap.get(key) : null; },
    setItem(key, value) { storageMap.set(key, String(value)); },
    removeItem(key) { storageMap.delete(key); }
  };
  const elMap = {};
  const anchors = [];
  const intervals = [];
  const timeouts = [];
  let intervalId = 1;
  let beeps = 0;
  let now = opts.now == null ? 1_700_000_000_000 : opts.now;
  const RealDate = Date;

  function makeEl(tag) {
    const el = {
      tag: tag || 'div',
      style: {},
      value: '',
      textContent: '',
      checked: false,
      disabled: false,
      className: '',
      dataset: {},
      placeholder: '',
      inputMode: '',
      type: '',
      hidden: false,
      id: '',
      title: '',
      open: false,
      children: [],
      options: [{}, {}],
      selectedIndex: 0,
      attributes: {},
      playCount: 0,
      clicked: false,
      href: '',
      appendChild(child) {
        this.children.push(child);
        child.parentElement = this;
        return child;
      },
      addEventListener() {},
      setAttribute(name, value) {
        this.attributes[name] = String(value);
        if (name === 'data-testid') this.dataset.testid = String(value);
        if (name === 'data-value') this.dataset.value = String(value);
      },
      getAttribute(name) { return this.attributes[name]; },
      querySelector(sel) {
        return this.children.find((child) => `input.${child.className}` === sel) || null;
      },
      closest() { return null; },
      focus() {},
      select() {},
      remove() {},
      pause() {},
      play() {
        this.playCount += 1;
        beeps += 1;
        return Promise.resolve();
      },
      click() {
        this.clicked = true;
        if (typeof this.onclick === 'function') this.onclick();
      }
    };
    let html = '';
    Object.defineProperty(el, 'innerHTML', {
      get() { return html; },
      set(value) {
        html = String(value);
        el.children = [];
      }
    });
    el.classList = {
      add(name) { el.className = `${el.className} ${name}`.trim(); },
      remove(name) {
        el.className = el.className.split(/\s+/).filter((part) => part && part !== name).join(' ');
      }
    };
    return el;
  }

  function getEl(id) {
    if (!elMap[id]) {
      elMap[id] = makeEl();
      if (id === 'workout' || id === 'circuitView' || id === 'editPanel' || id === 'saveDetails') {
        elMap[id].hidden = true;
      }
    }
    elMap[id].id = id;
    return elMap[id];
  }

  function FakeDate(...args) {
    if (!(this instanceof FakeDate)) return new RealDate(...args);
    if (args.length === 0) return new RealDate(now);
    return new RealDate(...args);
  }
  FakeDate.now = () => now;
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  FakeDate.prototype = RealDate.prototype;

  function AudioContext() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
    this.resume = () => {};
    this.createOscillator = () => ({
      frequency: { value: 0 },
      connect() { return this; },
      start() {},
      stop() {}
    });
    this.createGain = () => ({
      gain: {
        value: 0,
        setValueAtTime() {},
        exponentialRampToValueAtTime() {}
      },
      connect() { return this; }
    });
  }

  const href = `http://localhost/?${search || ''}`;
  const sandbox = {
    console, URL, URLSearchParams, Math, JSON, Object, Array, String,
    Number, parseInt, parseFloat, isNaN, Intl, Promise, RegExp, Error,
    decodeURIComponent, encodeURIComponent,
    Date: opts.fakeDate ? FakeDate : RealDate,
    location: { href, search: search ? `?${search}` : '', protocol: 'http:' },
    history: { replaceState() {}, pushState() {} },
    document: {
      title: '',
      body: makeEl('body'),
      getElementById: getEl,
      querySelectorAll(sel) {
        const found = [];
        function walk(node) {
          (node.children || []).forEach((child) => {
            found.push(child);
            walk(child);
          });
        }
        Object.keys(elMap).forEach((id) => walk(elMap[id]));
        if (sel === '.circuit-row') {
          return found.filter((node) => node.className.split(/\s+/).includes('circuit-row'));
        }
        return [];
      },
      createElement(tag) {
        const el = makeEl(tag);
        if (tag === 'a') anchors.push(el);
        return el;
      },
      addEventListener() {},
      execCommand() { return false; }
    },
    navigator: {
      clipboard: {
        writeText(text) {
          sandbox.copied.push(text);
          return Promise.resolve();
        }
      }
    },
    localStorage: storage,
    fetch: () => Promise.resolve({ ok: false, status: 404, text: async () => '' }),
    Audio: function Audio() {},
    AudioContext,
    webkitAudioContext: AudioContext,
    addEventListener() {},
    confirm: opts.confirm == null ? () => true : opts.confirm,
    setTimeout(fn) { timeouts.push(fn); return timeouts.length; },
    clearTimeout() {},
    setInterval(fn) {
      const id = intervalId++;
      intervals.push({ id, fn });
      return id;
    },
    clearInterval(id) {
      const index = intervals.findIndex((entry) => entry.id === id);
      if (index >= 0) intervals.splice(index, 1);
    }
  };
  sandbox.copied = [];
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = html.split('<script>').pop().split('</script>')[0];
  vm.createContext(sandbox);
  new vm.Script(script, { filename: 'index.html' }).runInContext(sandbox);

  return {
    sandbox,
    el: getEl,
    anchors,
    storage,
    timeouts,
    intervals,
    beeps: () => beeps,
    advance(ms) { now += ms; },
    tick() {
      intervals.slice().forEach((entry) => entry.fn());
    },
    flush() {
      const queued = timeouts.splice(0, timeouts.length);
      queued.forEach((fn) => fn());
    },
    run(code) { return vm.runInContext(code, sandbox); },
    param(name) { return vm.runInContext(`url.searchParams.get(${JSON.stringify(name)})`, sandbox); },
    workout() {
      const raw = vm.runInContext(`url.searchParams.get('currentWorkout')`, sandbox);
      return JSON.parse(raw);
    }
  };
}

(function linearPrevNext() {
  const app = boot(session(
    [
      { name: 'Curl', reps: '10,8', weights: '20,20', times: '' },
      { name: 'Press', reps: '5', weights: '30', times: '' }
    ],
    [
      { name: 'Curl', reps: '', weights: '', times: '' },
      { name: 'Press', reps: '', weights: '', times: '' }
    ]
  ));
  app.flush();
  assert(app.el('currentExerciseName').value === 'Curl', 'starts on the first exercise');
  app.el('reps').value = '12';
  app.el('weights').value = '25';
  app.run('nextExercise()');
  assert(app.param('currentExerciseId') === '1', 'next moves to exercise 2');
  assert(app.el('currentExerciseName').value === 'Press', 'second exercise name is shown');
  assert(app.el('reps').value === '', 'second exercise reps start empty');
  app.el('reps').value = '6';
  app.run('prevExercise()');
  assert(app.param('currentExerciseId') === '0', 'prev returns to exercise 1');
  assert(app.el('reps').value === '12', 'reps survive next then prev');
  assert(app.el('weights').value === '25', 'weights survive next then prev');
  app.run('prevExercise()');
  assert(app.param('currentExerciseId') === '0', 'prev on the first exercise stays put');
  app.run('nextExercise()');
  assert(app.el('reps').value === '6', 'second exercise reps were kept');
  console.log('PASS: linear prev/next keeps reps and weights');
})();

(function quickButtons() {
  const app = boot(session(
    [{ name: 'Curl', reps: '10,8', weights: '20,15', times: '' }],
    [{ name: 'Curl', reps: '', weights: '', times: '' }]
  ));
  app.flush();
  const button = app.el('repsQuick').children.find((child) => child.className.indexOf('quick-current') !== -1);
  assert(button, 'previous-value quick button is rendered');
  assert(String(button.textContent) === '10', `quick button centers on 10, got ${button.textContent}`);
  button.click();
  assert(app.el('reps').value === '10', `quick button appends reps, got ${app.el('reps').value}`);
  assert(app.el('timer').textContent === '1m 30s', `quick button starts the rest timer, got ${app.el('timer').textContent}`);
  console.log('PASS: quick button appends the previous set and starts the timer');
})();

(function timerCompletesOnce() {
  const app = boot(session(
    [{ name: 'Curl', reps: '10', weights: '20', times: '' }],
    [{ name: 'Curl', reps: '', weights: '', times: '' }],
    { timerDefault: '1' }
  ), { fakeDate: true, now: 1_700_000_000_000 });
  app.flush();
  const intervalsBefore = app.intervals.length;
  app.run('resetTimer()');
  assert(app.intervals.length === intervalsBefore + 1, 'timer starts an interval');
  assert(app.el('timer').textContent === '1s', `timer shows 1s, got ${app.el('timer').textContent}`);
  app.advance(1000);
  app.tick();
  assert(app.beeps() === 1, `timer beeped ${app.beeps()} times`);
  assert(app.el('timer').textContent === '0s', 'timer stops at 0s');
  assert(app.intervals.length === intervalsBefore, 'timer interval is cleared');
  app.advance(1000);
  app.tick();
  assert(app.beeps() === 1, 'a later tick does not beep again');
  console.log('PASS: rest timer beeps once and stops');
})();

(function persistCircuit() {
  const app = boot(session(
    [
      { name: 'Cable Squats', reps: '10,10,10', weights: '12,12,12' },
      { name: 'Push-Ups', reps: '12,12,12', weights: '12,12,12' }
    ],
    [
      { name: 'Cable Squats', reps: '', weights: '', times: '' },
      { name: 'Push-Ups', reps: '', weights: '', times: '' }
    ],
    { circuit: '1', sets: '4', weightInc: '2.5', repsInc: '2', timerDefault: '45', currentRound: '1' }
  ));
  app.flush();
  app.run('saveInProgressState()');
  const saved = JSON.parse(app.storage.getItem('wt_in_progress'));
  assert(saved.circuit === '1', 'backup stores circuit');
  assert(saved.sets === '4', 'backup stores sets');
  assert(saved.weightInc === '2.5', 'backup stores weightInc');
  assert(saved.repsInc === '2', 'backup stores repsInc');
  assert(saved.timerDefault === '45', 'backup stores timerDefault');
  assert(saved.currentRound === '1', 'backup stores the round');

  const restored = boot('', { storage: { wt_in_progress: JSON.stringify(saved) } });
  restored.flush();
  assert(restored.param('circuit') === '1', 'restore keeps circuit mode');
  assert(restored.param('sets') === '4', 'restore keeps sets');
  assert(restored.param('weightInc') === '2.5', 'restore keeps weightInc');
  assert(restored.param('repsInc') === '2', 'restore keeps repsInc');
  assert(restored.param('timerDefault') === '45', 'restore keeps timerDefault');
  assert(restored.param('currentRound') === '1', 'restore keeps the round');
  assert(restored.el('workout').hidden === false, 'restored session is showing');
  assert(restored.el('circuitView').hidden === false, 'circuit panel is showing');
  assert(restored.el('linearView').hidden === true, 'linear panel is hidden for a circuit');
  restored.run('circuitNextRound()');
  assert(restored.param('currentRound') === '2', 'next round advances');
  assert(restored.el('timer').textContent === '45s',
    `finishing a round starts the rest timer, got ${restored.el('timer').textContent}`);
  console.log('PASS: circuit session persists and restores, and next round starts the timer');
})();

(function saveFiltersAndClearsBackup() {
  const withEmail = boot(session(
    [{ name: 'Curl', reps: '10', weights: '20', times: '' }],
    [
      { name: 'Curl', reps: '11', weights: '22', times: '' },
      { name: '', reps: '', weights: '', times: '' }
    ]
  ));
  withEmail.flush();
  withEmail.storage.setItem('wt_in_progress', '{"name":"Arms"}');
  withEmail.run('saveWorkout()');
  withEmail.run('persistCurrentState()');
  const savedWorkout = withEmail.workout();
  assert(savedWorkout.exercises.length === 1, 'empty-name exercises are dropped');
  assert(savedWorkout.exercises[0].name === 'Curl', 'named exercise is kept');
  assert(savedWorkout.endMilliseconds > 0, 'save stamps endMilliseconds');
  assert(withEmail.storage.getItem('wt_in_progress') == null, 'save clears the in-progress backup');
  assert(withEmail.anchors.length === 1 && withEmail.anchors[0].href.indexOf('mailto:me@example.com') === 0, 'email draft is addressed');
  assert(withEmail.sandbox.copied.length === 1, 'entry is copied');
  assert(withEmail.el('status').textContent.indexOf('Email drafted') !== -1, 'save status is announced');

  const noEmail = boot(session(
    [{ name: 'Curl', reps: '10', weights: '20', times: '' }],
    [{ name: 'Curl', reps: '11', weights: '22', times: '' }],
    { email: null }
  ));
  noEmail.flush();
  noEmail.run('saveWorkout()');
  assert(noEmail.anchors.length === 0, 'missing email does not open a mailto draft');
  assert(noEmail.el('status').textContent.indexOf('?email=') !== -1, 'missing email is explained');
  assert(noEmail.sandbox.copied.length === 1, 'missing email still copies the entry');
  assert(noEmail.storage.getItem('wt_in_progress') == null, 'backup stays cleared after the click persist');
  console.log('PASS: save filters exercises, clears the backup, and warns when email is missing');
})();

(function neverCompletedAndCurrentTime() {
  const previous = [{ name: 'Toe touch', reps: '', weights: '', times: '' }];
  const current = [{ name: 'Toe touch', reps: '', weights: '', times: '' }];
  const params = new URLSearchParams(session(previous, current));
  const previousWorkout = JSON.parse(params.get('previousWorkout'));
  previousWorkout.endMilliseconds = 0;
  previousWorkout.startMilliseconds = 0;
  params.set('previousWorkout', JSON.stringify(previousWorkout));
  const currentWorkout = JSON.parse(params.get('currentWorkout'));
  currentWorkout.startMilliseconds = Date.now() - (90 * 60 * 1000);
  params.set('currentWorkout', JSON.stringify(currentWorkout));
  const app = boot(params.toString());
  app.flush();
  assert(app.el('workoutLastCompleted').textContent === 'Last Date: never',
    `never-completed date, got ${app.el('workoutLastCompleted').textContent}`);
  assert(app.el('workoutCurrentDuration').textContent.indexOf('90m') !== -1,
    `current time should include 90m, got ${app.el('workoutCurrentDuration').textContent}`);
  console.log('PASS: never-completed date and current time past one hour');
})();

(function malformedStateFallsBack() {
  const app = boot('name=Broken&email=me@example.com&weightInc=2.5&currentWorkout=%7Bbad&previousWorkout=%7Bbad');
  assert(app.el('topStatus').textContent.indexOf('Could not read') !== -1,
    `malformed state status, got ${app.el('topStatus').textContent}`);
  assert(app.el('workout').hidden === true, 'malformed state returns to the picker');
  assert(app.param('name') == null, 'malformed workout params are dropped');
  assert(app.param('email') === 'me@example.com', 'email is kept after a bad link');
  assert(app.param('weightInc') === '2.5', 'settings are kept after a bad link');
  console.log('PASS: malformed state falls back to the picker');
})();

(function placeholderIsIgnored() {
  const app = boot('');
  app.el('selectWorkout').value = '';
  app.run('selectWorkout()');
  assert(app.param('name') == null, 'placeholder does not start a workout');
  assert(app.el('workout').hidden === true, 'picker stays up');
  console.log('PASS: Choose a workout placeholder is ignored');
})();

(function goHomeKeepsSettings() {
  const search = session(
    [{ name: 'Curl', reps: '10', weights: '20', times: '' }],
    [{ name: 'Curl', reps: '', weights: '', times: '' }],
    { weightInc: '2.5', repsInc: '2', timerDefault: '60', circuit: '1' }
  );
  const cancelled = boot(search, { confirm: () => false });
  cancelled.flush();
  cancelled.storage.setItem('wt_in_progress', '{"name":"Arms"}');
  cancelled.run('goHome()');
  assert(cancelled.param('name') === 'Arms', 'cancelling Home keeps the workout');
  assert(cancelled.storage.getItem('wt_in_progress') === '{"name":"Arms"}', 'cancelling Home keeps the backup');

  const app = boot(search, { confirm: () => true });
  app.flush();
  app.storage.setItem('wt_in_progress', '{"name":"Arms"}');
  app.run('goHome()');
  assert(app.param('name') == null, 'Home drops the routine');
  assert(app.param('circuit') == null, 'Home drops circuit');
  assert(app.param('currentWorkout') == null, 'Home drops the session');
  assert(app.param('email') === 'me@example.com', 'Home keeps email');
  assert(app.param('weightInc') === '2.5', 'Home keeps weightInc');
  assert(app.param('repsInc') === '2', 'Home keeps repsInc');
  assert(app.param('timerDefault') === '60', 'Home keeps timerDefault');
  assert(app.storage.getItem('wt_in_progress') == null, 'Home clears the backup');
  assert(app.el('workout').hidden === true, 'Home shows the picker');
  console.log('PASS: Home keeps email and settings');
})();
