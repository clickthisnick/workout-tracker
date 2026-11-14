const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

// The app tolerates `//` comment lines in workout files (the email flow
// produces them); mirror that parsing too.
function parseWorkoutJson(text) {
  return JSON.parse(text.replace(/^[ \t]*\/\/.*$/gm, ''));
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const stubEl = () => ({
  style: {}, value: '', textContent: '', innerHTML: '', checked: false,
  disabled: false, className: '', dataset: {}, placeholder: '', inputMode: '',
  type: '', appendChild() {}, addEventListener() {}
});
const documentStub = {
  getElementById: stubEl,
  querySelectorAll: () => ([]),
  createElement: stubEl,
  addEventListener() {}
};
const sandbox = {
  console, URL, URLSearchParams, Date, Math, JSON, Object, Array, String,
  Number, parseInt, parseFloat, isNaN,
  location: { href: 'http://localhost/', search: '', replaceState() {}, pushState() {} },
  history: { replaceState() {}, pushState() {} },
  document: documentStub,
  navigator: {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  fetch: (url) => new Promise((resolve) => {
    const pathname = new URL(url).pathname;
    let file;
    try {
      file = path.normalize(path.join(root, pathname));
      if (!file.startsWith(root)) throw new Error('Forbidden');
      const text = fs.readFileSync(file, 'utf8');
      resolve({ ok: true, status: 200, text: async () => text });
    } catch (_err) {
      resolve({ ok: false, status: 404, text: async () => '' });
    }
  }),
  Audio: function() {}, addEventListener() {}
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

const script = html.split('<script>').pop().split('</script>')[0];
const scriptWithDevBase = script.replace(
  /const baseUrl = 'https:\/\/www\.clickthisnick\.com\/workout-tracker';/,
  "const baseUrl = 'http://localhost:8080';"
);
new vm.Script(scriptWithDevBase, { filename: 'index.html' });
vm.createContext(sandbox);
new vm.Script(scriptWithDevBase).runInContext(sandbox);
console.log('Build OK: index.html script parses and boots.');

let workoutFiles = 0;
for (const file of fs.readdirSync(path.join(root, 'src/workouts'))) {
  if (file.endsWith('.json')) {
    const parsed = parseWorkoutJson(fs.readFileSync(path.join(root, 'src/workouts', file), 'utf8'));
    if (!Array.isArray(parsed.workouts)) {
      throw new Error(`Invalid workout file: ${file}`);
    }
    workoutFiles += 1;
  }
}
console.log(`Build OK: ${workoutFiles} workout JSON files parse.`);

function assertRoutineShape(file, data) {
  if (!data || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error(`${file}: routine name must be a non-empty string`);
  }
  if (data.circuit != null && typeof data.circuit !== 'boolean') {
    throw new Error(`${file}: circuit must be a boolean when present`);
  }
  if (data.sets != null && (typeof data.sets !== 'number' || !Number.isFinite(data.sets) || data.sets < 1)) {
    throw new Error(`${file}: sets must be a positive number when present`);
  }
  if (!Array.isArray(data.workouts) || data.workouts.length === 0) {
    throw new Error(`${file}: workouts must be a non-empty array`);
  }
  data.workouts.forEach((session, i) => {
    if (!session || typeof session !== 'object' || Array.isArray(session)) {
      throw new Error(`${file}: session ${i} must be an object`);
    }
    if (typeof session.endMilliseconds !== 'number' || !Number.isFinite(session.endMilliseconds)) {
      throw new Error(`${file}: session ${i} endMilliseconds must be a number`);
    }
    if (typeof session.startMilliseconds !== 'number' || !Number.isFinite(session.startMilliseconds)) {
      throw new Error(`${file}: session ${i} startMilliseconds must be a number`);
    }
    if (!Array.isArray(session.exercises)) {
      throw new Error(`${file}: session ${i} exercises must be an array`);
    }
    session.exercises.forEach((exercise, j) => {
      if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise)) {
        throw new Error(`${file}: session ${i} exercise ${j} must be an object`);
      }
      if (typeof exercise.name !== 'string') {
        throw new Error(`${file}: session ${i} exercise ${j} name must be a string`);
      }
      for (const field of ['reps', 'weights', 'times']) {
        if (exercise[field] != null && typeof exercise[field] !== 'string') {
          throw new Error(`${file}: session ${i} exercise ${j} ${field} must be a string`);
        }
      }
    });
  });
}

const active = parseWorkoutJson(fs.readFileSync(path.join(root, 'src/workouts/active.json'), 'utf8'));
if (!active || !Array.isArray(active.workouts) || active.workouts.length === 0) {
  throw new Error('active.json must list workout filenames');
}
for (const name of active.workouts) {
  if (typeof name !== 'string' || !name.endsWith('.json')) {
    throw new Error(`Active workout must be a .json filename: ${name}`);
  }
  const activePath = path.join(root, 'src/workouts', name);
  if (!fs.existsSync(activePath) &&
      !fs.existsSync(path.join(root, 'src/workouts/archived', name)) &&
      !fs.existsSync(path.join(root, 'src/workouts/archived2', name))) {
    throw new Error(`Active workout not found: ${name}`);
  }
  if (fs.existsSync(activePath)) {
    assertRoutineShape(name, parseWorkoutJson(fs.readFileSync(activePath, 'utf8')));
  }
}
console.log('Build OK: active.json entries exist and have a valid exercise shape.');
