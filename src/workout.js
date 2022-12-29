const app = angular.module('WorkoutApp', []);

function getTimeMilliseconds() {
  const date = new Date();
  return date.getTime();
}

function millisecondsToMinSeconds(ms) {
  const msRound = 1000 * Math.round(ms / 1000); // round to nearest second
  const d = new Date(msRound);
  return d.getUTCMinutes() + ':' + d.getUTCSeconds(); // "4:59"
}

function loadWorkoutData(httpReq) {
  const workoutLink = 'https://www.clickthisnick.com/workout-tracker/src/workouts';

  return new Promise((resolve) => {
    httpReq.get(`${workoutLink}/active.json`).success(function(activeWorkouts) {
      resolve(activeWorkouts);
    });
  }).then((activeWorkouts) => {
    const workoutPromises = activeWorkouts['workouts'].map((workoutFile) => {
      // To get around cors locally.. load from github
      return new Promise((resolve) => {
        httpReq.get(`${workoutLink}/${workoutFile}`).success(function(data) {
          resolve(data);
        });
      });
    });

    return Promise.all(workoutPromises);
  });
}

function reverse(array) {
  const output = [];
  while (array.length) {
    output.push(array.pop());
  }

  return output;
}

app.filter('reverse', function() {
  return function(items) {
    return reverse(items);
  };
});

function playSound(url) {
  const audio = new Audio(url);
  audio.play();
}

app.controller('WorkoutController', function($http) {
  const workout = this;

  workout.started = false;
  workout.saved = false;

  // This is the last excercise rep
  // Its used to calculate the rep button amount
  workout.lastExerciseRep = '';

  // This is the last excercise Weight
  // Its used to calculate the Weight button amount
  workout.lastExerciseWeight = '';

  workout.timerStarted = false;

  workout.timer = function() {
    workout.timerStarted = true;

    const timeSpan = document.getElementById('timer');
    const mins = 1.5;
    const now = new Date().getTime();
    const deadline = mins * 60 * 1000 + now;

    try {
      clearInterval(workout.refreshIntervalId);
    } catch {
      pass;
    }

    workout.refreshIntervalId = setInterval(() => {
      const currentTime = new Date().getTime();
      const distance = deadline - currentTime;
      let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      // The minutes are 1 off once negative
      if (minutes < 0) {
        minutes = minutes + 1;
      }

      if (minutes == 0 && seconds == 0) {
        workout.timerStarted = false;
      }

      if (minutes == 0 && seconds <= 0 && seconds > -2) {
        playSound('sounds/a-tone.mp3');
      }

      let timeToShow = minutes + 'm ' + seconds + 's';

      if (minutes == 0) {
        timeToShow = seconds + 's';
      }

      timeSpan.innerHTML = timeToShow;
    }, 500);
  };

  // TODO Use these later
  workout.equipment = {
    'thick bar': 25,
    'ez curl bar': 15,
    'bench bar': 45,
  };

  workout.data = {
    'routines': [

    ],
  };

  loadWorkoutData($http).then((routines) => {
    workout.data.routines = routines;
  }).then(() => {
    const selectBox = document.getElementById('selectBox');

    workout.data.routines.forEach((routine) => {
      const routineMs = routine.endMilliseconds[routine.endMilliseconds.length - 1];
      const ms = getTimeMilliseconds();
      const msSinceWorkout = ms - routineMs;

      const daysSinceLastDoneWorkout = Math.floor(msSinceWorkout / (1000 * 60 * 60) / 24);
      routine.daysAgo = daysSinceLastDoneWorkout;

      // TODO can sort by the longest workout ago
      // | orderBy:'daysAgo' | reverse
      const opt1 = document.createElement('option');
      opt1.value = routine.name;
      opt1.text = `${routine.name} - ${routine.daysAgo} Days Ago - ${routine.workoutTime[routine.workoutTime.length - 1]}`;
      selectBox.add(opt1, null);
    });
  });

  workout.start = function(name) {
    // Changes the routine from the id to the whole entity
    // Also created arrays for reps and weight
    workout.started = true;
    workout.currentRoutine = workout.data.routines.filter((routine) => routine.name == name)[0];
    workout.currentRoutine.name = workout.currentRoutine.name;
    workout.currentRoutine.people = Object.keys(workout.currentRoutine.exercises[0].reps);
    workout.currentRoutine.currentPerson = workout.currentRoutine.people[0];
    workout.currentExerciseId = 0;
    workout.exerciseCount = 0;
    workout.currentRoutine.startMilliseconds.push(getTimeMilliseconds());

    // let date = new Date(milliseconds);
    // date.toString()
    // Gives you human readable from that

    // Add new rep/weight entries to all exercises of loaded routine
    workout.currentRoutine.exercises.forEach((exercise) => {
      // workout.currentRoutine.exercises[workout.currentExerciseId]
      exercise.reps[workout.currentRoutine.currentPerson].push([]);
      exercise.weight[workout.currentRoutine.currentPerson].push([]);
      workout.exerciseCount += 1;
    });

    workout.refreshWorkoutData();
  };

  workout.changePeople = function(person) {
    workout.saveItems();
    workout.currentRoutine.currentPerson = person;
    workout.refreshWorkoutData();
  };

  workout.saveItems = function() {
    const currentExercise = workout.currentRoutine.exercises[workout.currentExerciseId];
    const currentExerciseReps = currentExercise.reps[workout.currentRoutine.currentPerson];
    const currentExerciseWeight = currentExercise.weight[workout.currentRoutine.currentPerson];

    // Incase not filled out
    if (workout.currentReps.length !== 0) {
      const repLength = currentExerciseReps.length;
      currentExerciseReps[repLength - 1] = workout.currentReps.split(',').map(Number);
    }

    // Incase not filled out
    if (workout.currentWeight.length !== 0) {
      const weightLength = currentExerciseWeight.length;
      currentExerciseWeight[weightLength - 1] = workout.currentWeight.split(',').map(Number);
    }
  };

  workout.refreshWorkoutData = function() {
    workout.previousExerciseData = workout.currentRoutine.exercises[workout.currentExerciseId];
    workout.previousExerciseDataReps = workout.previousExerciseData.reps[workout.currentRoutine.currentPerson];
    workout.previousExerciseDataWeight = workout.previousExerciseData.weight[workout.currentRoutine.currentPerson];

    // Handle first time using routine
    if (workout.previousExerciseDataReps.length > 1) {
      workout.previousExerciseReps = workout.previousExerciseDataReps.slice(Math.max(workout.previousExerciseDataReps.length - 2, 0))[0];
      workout.lastExerciseRep = workout.previousExerciseReps[workout.previousExerciseReps.length - 1];
    } else {
      workout.previousExerciseReps = '';
      workout.lastExerciseRep = '';
    }

    if (workout.previousExerciseDataWeight.length > 1) {
      workout.previousExerciseWeight = workout.previousExerciseDataWeight.slice(Math.max(workout.previousExerciseDataWeight.length - 2, 0))[0];
      workout.lastExerciseWeight = workout.previousExerciseWeight[workout.previousExerciseWeight.length - 1];
    } else {
      workout.previousExerciseWeight = '';
      workout.lastExerciseWeight = '';
    }

    workout.currentExerciseData = workout.currentRoutine.exercises[workout.currentExerciseId];
    workout.currentExerciseDataReps = workout.currentExerciseData.reps[workout.currentRoutine.currentPerson];
    workout.currentExerciseDataWeight = workout.currentExerciseData.weight[workout.currentRoutine.currentPerson];

    // These will be string inputs on page, but array in data model
    workout.currentReps = workout.currentExerciseDataReps.slice(Math.max(workout.currentExerciseDataReps.length - 1, 0))[0].toString();
    workout.currentWeight = workout.currentExerciseDataWeight.slice(Math.max(workout.currentExerciseDataWeight.length - 1, 0))[0].toString();
  };

  workout.addWeight = function(weight) {
    if (workout.currentWeight != '') {
      workout.currentWeight += ',';
    }

    workout.currentWeight += weight;

    // Also restart the timer if not already
    workout.timer();
  };

  workout.addReps = function(reps) {
    if (workout.currentReps != '') {
      workout.currentReps += ',';
    }

    workout.currentReps += reps;

    // Also restart the timer if not already
    workout.timer();
  };

  workout.nextExercise = function() {
    // TODO should just disable button if not available
    if (workout.currentExerciseId < workout.exerciseCount - 1) {
      workout.saveItems();
      workout.currentExerciseId += 1;
      workout.refreshWorkoutData();
    }
  };

  workout.previousExercise = function() {
    if (workout.currentExerciseId > 0) {
      workout.saveItems();
      workout.currentExerciseId -= 1;
      workout.refreshWorkoutData();
    }
  };

  workout.generateJSON = function() {
    // Ensure current page is saved
    workout.saveItems();

    // Show json entry box
    workout.saved = true;

    // Add an end time to the workout
    workout.currentRoutine.endMilliseconds.push(getTimeMilliseconds());

    // Add a human readable workout time
    let endMs = workout.currentRoutine.endMilliseconds;
    endMs = endMs[endMs.length - 1];

    let startMs = workout.currentRoutine.startMilliseconds;
    startMs = startMs[startMs.length - 1];

    const routineMs = endMs - startMs;

    workout.currentRoutine.workoutTime.push(millisecondsToMinSeconds(routineMs));

    const date = new Date(endMs);
    workout.currentRoutine.workoutTimeString.push(date.toString());

    // Remove this $$hashKey
    delete workout.currentRoutine['$$hashKey'];
    delete workout.currentRoutine['daysAgo'];
    delete workout.currentRoutine['people'];
    delete workout.currentRoutine['currentPerson'];

    workout.json = JSON.stringify(workout.currentRoutine);

    const a = document.createElement('a');
    a.target = '_blank';
    a.href = `mailto:remove_this@email.com?subject=${encodeURIComponent('Workout')}&body=${encodeURIComponent(workout.json)}`;
    a.click();
  };
});
