const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = '/home/mypi/Documents/workout-tracker';

function makeEl(childrenList) {
  return {
    style: {}, value: '', textContent: '', innerHTML: '', checked: false,
    disabled: false, className: '', dataset: {}, placeholder: '', inputMode: '',
    type: '', children: childrenList || [], classList: { add() {}, remove() {} },
    appendChild(c) { if (!this.children.includes(c)) this.children.push(c); },
    querySelector(sel) { return this.children.find(c => `input.${c.className}` === sel) || null; },
    addEventListener() {}
  };
}
const elMap = {};
const getEl = (id) => elMap[id] || (elMap[id] = makeEl());
const circuitRounds = makeEl(); circuitRounds.children = [];
let roundsHTML = '';
Object.defineProperty(circuitRounds, 'innerHTML', {
  get: () => roundsHTML,
  set: (v) => { roundsHTML = String(v); circuitRounds.children = []; }
});
elMap.circuitRounds = circuitRounds;
const documentStub = {
  getElementById: getEl,
  querySelectorAll: (sel) => sel === '.circuit-row'
    ? circuitRounds.children.filter(r => r.className === 'circuit-row')
    : [],
  createElement: (tag) => {
    const e = makeEl();
    if (tag === 'div') circuitRounds.children.push(e);
    return e;
  },
  addEventListener() {}
};

const previous = {
  startMilliseconds: 0, endMilliseconds: 0,
  exercises: [
    {name: 'Cable Squats', reps: '10,10,10', weights: '12,12,12'},
    {name: 'Push-Ups', reps: '12,12,12', weights: '12,12,12'}
  ]
};
const current = {
  startMilliseconds: 1, endMilliseconds: 0,
  exercises: JSON.parse(JSON.stringify(previous.exercises))
    .map(e => ({name: e.name, reps: '', weights: '', times: ''}))
};
const url = new URL('http://localhost/');
const queued = [];
const sandbox = {
  console, URL, URLSearchParams, Date, Math, JSON, Object, Array, String,
  Number, parseInt, parseFloat, isNaN,
  location: { href: url.href, replaceState() {}, pushState() {} },
  history: { replaceState() {}, pushState() {} },
  document: documentStub, navigator: {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  fetch: () => Promise.resolve({ ok: false, status: 404, text: async () => '' }),
  Audio: function() {}, addEventListener() {},
  setTimeout: (fn) => { queued.push(fn); return queued.length; },
  clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {}
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = html.split('<script>').pop().split('</script>')[0]
  .replace(/const baseUrl = 'https:\/\/www\.clickthisnick\.com\/workout-tracker';/,
    "const baseUrl = 'http://localhost:8080';");
vm.createContext(sandbox);
new vm.Script(script, { filename: 'index.html' }).runInContext(sandbox);

vm.runInContext(`
  url.searchParams.set("name", "Circuit");
  url.searchParams.set("file", "innodigym_circuit.json");
  url.searchParams.set("circuit", "1");
  url.searchParams.set("sets", "3");
  url.searchParams.set("previousWorkout", ${JSON.stringify(JSON.stringify(previous))});
  url.searchParams.set("currentWorkout", ${JSON.stringify(JSON.stringify(current))});
  url.searchParams.set("currentExerciseId", "0");
  url.searchParams.set("currentRound", "0");
`, sandbox);
for (const id of ['exerciseCount','circuitPrevBtn','circuitNextBtn','circuitRounds',
  'circuitWaterBanner','workoutName','workoutLastCompleted','workoutLastDuration',
  'workoutCurrentDuration','workout','linearView','circuitView','reps','weights',
  'times','currentExerciseName','status','topStatus','timer','repsQuick','weightsQuick',
  'previousWorkoutExerciseReps','previousWorkoutExerciseWeights','previousWorkoutExerciseTimes',
  'prevExerciseBtn','beepSound']) getEl(id);
queued.length = 0;
vm.runInContext('startWorkout(url.searchParams.get("name"))', sandbox);

function rows() { return circuitRounds.children.filter(r => r.className === 'circuit-row'); }
function setInput(i, sel, v) { rows()[i].querySelector(sel).value = v; }
function app(fn) { vm.runInContext(`${fn}()`, sandbox); }
function dump() { return JSON.parse(vm.runInContext(`url.searchParams.get('currentWorkout')`, sandbox)); }

// Round 0
setInput(0, 'input.circuit-reps', '15');
setInput(0, 'input.circuit-weights', '20');
setInput(1, 'input.circuit-reps', '18');
setInput(1, 'input.circuit-weights', '22');
app('circuitNextRound');
app('persistCurrentState');
let saved = dump();
if (saved.exercises[0].reps.split(',')[0] !== '15') throw new Error(`FAIL after Next: exercise 0 round 0 reps = ${saved.exercises[0].reps}`);
if (saved.exercises[0].weights.split(',')[0] !== '20') throw new Error(`FAIL after Next: exercise 0 round 0 weights = ${saved.exercises[0].weights}`);

// Round 1
setInput(0, 'input.circuit-reps', '16');
setInput(0, 'input.circuit-weights', '21');
setInput(1, 'input.circuit-reps', '19');
setInput(1, 'input.circuit-weights', '23');
app('circuitNextRound');
app('persistCurrentState');
// Back to round 0
app('circuitPrevRound');
app('persistCurrentState');

saved = dump();
const expect = [
  {reps: ['15', '16', ''], weights: ['20', '21', '']},
  {reps: ['18', '19', ''], weights: ['22', '23', '']}
];
saved.exercises.forEach((ex, i) => {
  const r = ex.reps.split(',');
  const w = ex.weights.split(',');
  expect[i].reps.forEach((v, j) => {
    if (r[j] !== v) throw new Error(`FAIL: exercise ${i} round ${j} reps = ${r[j]}, want ${v}`);
  });
  expect[i].weights.forEach((v, j) => {
    if (w[j] !== v) throw new Error(`FAIL: exercise ${i} round ${j} weights = ${w[j]}, want ${v}`);
  });
});
console.log('PASS: circuit reps/weights survive Next -> Prev -> Prev',
  JSON.stringify(saved.exercises.map(e => ({reps: e.reps, weights: e.weights}))));
