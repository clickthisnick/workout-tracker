const fs = require('fs');
const path = require('path');
const { parseWorkoutJson } = require('./workout-json');

const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'src/workouts');

let workoutFiles = 0;
for (const file of fs.readdirSync(folder)) {
  if (!file.endsWith('.json')) continue;
  const full = path.join(folder, file);
  if (!fs.statSync(full).isFile()) continue;
  const parsed = parseWorkoutJson(fs.readFileSync(full, 'utf8'));
  if (!Array.isArray(parsed.workouts)) {
    throw new Error(`Invalid workout file: ${file}`);
  }
  workoutFiles += 1;
}
console.log(`OK: ${workoutFiles} workout JSON files parse.`);

/**
 * @param {string} file
 * @param {any} data
 */
function assertRoutineShape(file, data) {
  if (!data || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error(`${file}: routine name must be a non-empty string`);
  }
  if (data.circuit != null && typeof data.circuit !== 'boolean') {
    throw new Error(`${file}: circuit must be a boolean when present`);
  }
  if (
    data.sets != null &&
    (typeof data.sets !== 'number' || !Number.isFinite(data.sets) || data.sets < 1)
  ) {
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
    if (
      typeof session.startMilliseconds !== 'number' ||
      !Number.isFinite(session.startMilliseconds)
    ) {
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

const active = parseWorkoutJson(fs.readFileSync(path.join(folder, 'active.json'), 'utf8'));
if (!active || !Array.isArray(active.workouts) || active.workouts.length === 0) {
  throw new Error('active.json must list workout filenames');
}
for (const name of active.workouts) {
  if (typeof name !== 'string' || !name.endsWith('.json')) {
    throw new Error(`Active workout must be a .json filename: ${name}`);
  }
  const activePath = path.join(folder, name);
  if (
    !fs.existsSync(activePath) &&
    !fs.existsSync(path.join(folder, 'archived', name)) &&
    !fs.existsSync(path.join(folder, 'archived2', name))
  ) {
    throw new Error(`Active workout not found: ${name}`);
  }
  if (fs.existsSync(activePath)) {
    assertRoutineShape(name, parseWorkoutJson(fs.readFileSync(activePath, 'utf8')));
  }
}
console.log('OK: active.json entries exist and have a valid exercise shape.');
