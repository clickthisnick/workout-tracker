const fs = require('fs');
const path = require('path');
const { parseWorkoutJson } = require('./workout-json');

// Prints unique exercise names from the top-level routine files.
// Not part of the site: GitHub Pages serves index.html and src/app.js as-is.

const folder = path.join(__dirname, '..', 'src/workouts');
const names = new Set();

for (const item of fs.readdirSync(folder)) {
  if (!item.endsWith('.json')) continue;
  const full = path.join(folder, item);
  if (!fs.statSync(full).isFile()) continue;
  const data = parseWorkoutJson(fs.readFileSync(full, 'utf8'));
  const workouts = data && data.workouts;
  if (!Array.isArray(workouts)) continue;
  for (const workout of workouts) {
    if (!workout || typeof workout !== 'object' || Array.isArray(workout)) continue;
    if (!Array.isArray(workout.exercises)) continue;
    for (const exercise of workout.exercises) {
      if (exercise && exercise.name) names.add(exercise.name);
    }
  }
}

for (const name of [...names].sort((a, b) => a.localeCompare(b))) {
  console.log(name);
}
