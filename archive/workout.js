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

function playSound(duration=4) {
  const audio = document.getElementById("beep")

  if (audio) {
      // overrides the empty sound already played on the object
      // this is so ios will asynchronously play the sounds
      if (duration == 4) {
          audio.src = "../sounds/a-tone.mp3"
      } else {
          audio.src = "../sounds/a-tone.mp3"
      }
      audio.play()
  }
}

function playSound(url) {
  const audio = new Audio(url);
  audio.play();
}

app.controller('WorkoutController', function($http) {
  const workout = this;

  workout.started = false;
  workout.saved = false;

  // This is the last exercise rep
  // Its used to calculate the rep button amount
  workout.lastExerciseRep = '';

  // This is the last exercise Weight
  // Its used to calculate the Weight button amount
  workout.lastExerciseWeight = '';

  workout.timerStarted = false;

  workout.timer = function() {
    workout.timerStarted = true;

    const timeSpan = document.getElementById('timer');
    const mins = .1;
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
        playSound();
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

  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });

  // routine.name
  // Get the value of "some_key" in eg "https://example.com/?name=some_value"
  const routineName = params.name; // "some_value"

  workout.start = function(name) {
    // Changes the routine from the id to the whole entity
    // Also created arrays for reps and weight
    workout.started = true;
    console.log
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
      workout.currentRoutine.people.forEach((person) => {
        exercise.reps[person].push([]);
        exercise.weight[person].push([]);
      });
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
    // The only reason saveItems exists is because we can type out reps/weights as a string
    // Which then needs to get converted into an array

    const currentExercise = workout.currentRoutine.exercises[workout.currentExerciseId];
    const currentExerciseReps = currentExercise.reps[workout.currentRoutine.currentPerson];
    const currentExerciseWeight = currentExercise.weight[workout.currentRoutine.currentPerson];

    // In case not filled out
    if (workout.currentRepsStr && workout.currentRepsStr.length !== 0) {
      const repLength = currentExerciseReps.length;
      currentExerciseReps[repLength - 1] = workout.currentRepsStr.split(',').map(Number);
    }

    // In case not filled out
    if (workout.currentWeightsStr && workout.currentWeightsStr.length !== 0) {
      const weightLength = currentExerciseWeight.length;
      currentExerciseWeight[weightLength - 1] = workout.currentWeightsStr.split(',').map(Number);
    }
  };

  workout.refreshWorkoutData = function() {
    // This refreshes the workout data show to be the current person
    // Also it refreshes the reps/weight boxes based on last values

    const currentExercise = workout.currentRoutine.exercises[workout.currentExerciseId];
    const currentExerciseReps = currentExercise.reps[workout.currentRoutine.currentPerson];
    const currentExerciseWeights = currentExercise.weight[workout.currentRoutine.currentPerson];

    workout.previousReps = currentExerciseReps.slice(Math.max(currentExerciseReps.length - 2, 0))[0];
    workout.previousWeights = currentExerciseWeights.slice(Math.max(currentExerciseWeights.length - 2, 0))[0];

    workout.currentRepsStr = currentExerciseReps[currentExerciseReps.length - 1].toString();
    workout.currentWeightsStr = currentExerciseWeights[currentExerciseWeights.length - 1].toString();

    // filter removes empty strings
    // make getCurrentReps which converts from str to array quickly
    const exeriseReps = workout.previousReps.concat(workout.currentRepsStr.split(',').map(Number)).filter((n) => n);
    const exeriseRepsLast = exeriseReps[exeriseReps.length - 1];

    const exeriseWeight = workout.previousWeights.concat(workout.currentWeightsStr.split(',').map(Number)).filter((n) => n);
    const exeriseWeightLast = exeriseWeight[exeriseWeight.length - 1];

    workout.generateLastReps(exeriseRepsLast);
    workout.generateLastWeights(exeriseWeightLast);
  };

  workout.addWeights = function(amount) {
    if (!workout.currentWeightsStr) {
      workout.currentWeightsStr = '';
    } else {
      workout.currentWeightsStr += ',';
    }

    workout.currentWeightsStr += amount;
    workout.saveItems();
    workout.refreshWorkoutData();

    // Also restart the timer if not already
    if (!workout.timerStarted) {
      workout.timer();
    }
  };

  workout.generateLastWeights = function(lastExceriseWeight) {
    if (!lastExceriseWeight) {
      lastExceriseWeight = 0;
    }

    workout.lastExerciseWeights = [
      lastExceriseWeight - 10,
      lastExceriseWeight - 5,
      lastExceriseWeight,
      lastExceriseWeight + 5,
      lastExceriseWeight + 10,
    ];
  };

  workout.generateLastReps = function(lastExerciseRep) {
    if (!lastExerciseRep) {
      lastExerciseRep = 0;
    }
    workout.lastExerciseReps = [
      lastExerciseRep - 10,
      lastExerciseRep - 5,
      lastExerciseRep,
      lastExerciseRep + 5,
      lastExerciseRep + 10,
    ];
  };


  workout.addReps = function(reps) {
    if (!workout.currentRepsStr) {
      workout.currentRepsStr = '';
    } else {
      workout.currentRepsStr += ',';
    }

    workout.currentRepsStr += reps;
    workout.saveItems();
    workout.refreshWorkoutData();

    // Also restart the timer if not already
    if (!workout.timerStarted) {
      workout.timer();
    }
  };

  workout.nextExercise = function() {
    workout.saveItems();
    workout.currentExerciseId += 1;
    workout.refreshWorkoutData();
  };

  workout.previousExercise = function() {
    workout.saveItems();
    workout.currentExerciseId -= 1;
    workout.refreshWorkoutData();
  };

  workout.generateJSON = function() {
    // Ensure current page is saved
    workout.saveItems();

    // Show json entry box
    workout.saved = true;

    // Once you hit save you cannot click it again
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
    delete workout.currentRoutine['currentPerson'];
    delete workout.currentRoutine['people'];

    workout.json = JSON.stringify(workout.currentRoutine);

    const a = document.createElement('a');
    a.target = '_blank';
    a.href = `mailto:remove_this@email.com?subject=${encodeURIComponent('Workout')}&body=${encodeURIComponent(workout.json)}`;
    a.click();
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

      if (routineName) {
        workout.start("Chest/Back")
      }
    });
  });


});
