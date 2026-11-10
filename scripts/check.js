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
    } catch (err) {
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

const active = parseWorkoutJson(fs.readFileSync(path.join(root, 'src/workouts/active.json'), 'utf8'));
for (const name of active.workouts) {
  if (!fs.existsSync(path.join(root, 'src/workouts', name)) &&
      !fs.existsSync(path.join(root, 'src/workouts/archived', name)) &&
      !fs.existsSync(path.join(root, 'src/workouts/archived2', name))) {
    throw new Error(`Active workout not found: ${name}`);
  }
}
console.log('Build OK: active.json entries exist.');
