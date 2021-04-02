var app = angular.module("WorkoutApp", []);

function getTimeMilliseconds() {
    let date = new Date();
    return date.getTime();
}

function millisecondsToMinSeconds(ms) {
    let ms_round = 1000*Math.round(ms/1000); // round to nearest second
    let d = new Date(ms_round);
    return d.getUTCMinutes() + ':' + d.getUTCSeconds(); // "4:59"
}

function loadWorkoutData(httpReq) {
    const workoutLink = "https://www.clickthisnick.com/workout-tracker/src/workouts";

    return new Promise((resolve) => { 
        httpReq.get(`${workoutLink}/active.json`).success(function (activeWorkouts) {
            resolve(activeWorkouts)
        })
    }).then((activeWorkouts) => {
        let workoutPromises = activeWorkouts['workouts'].map((workoutFile) => {
            // To get around cors locally.. load from github
            return new Promise((resolve) => {
                httpReq.get(`${workoutLink}/${workoutFile}`).success(function (data){
                    resolve(data);
                });
            });
        });

        return Promise.all(workoutPromises);
    })
}

function reverse(array) {
    var output = [];
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
    var workout = this;

    workout.started = false;
    workout.saved = false;

    // This is the last excercise rep
    // Its used to calculate the rep button amount
    workout.lastExerciseRep = ""

    // This is the last excercise Weight
    // Its used to calculate the Weight button amount
    workout.lastExerciseWeight = ""

    workout.timerStarted = false;

    workout.timer = function() {
        if (workout.timerStarted) {
            return
        };

        workout.timerStarted = true;

        var timeSpan = document.getElementById('timer');
        var mins = 1.5;
        var now = new Date().getTime();
        var deadline = mins * 60 * 1000 + now;

        try {
            clearInterval(workout.refreshIntervalId);
        } catch {
            pass
        }

        workout.refreshIntervalId = setInterval(() => {
            var currentTime = new Date().getTime();
            var distance = deadline - currentTime;
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // The minutes are 1 off once negative
            if (minutes < 0) {
                minutes = minutes + 1
            }

            if (minutes == 0 && seconds == 0) {
                workout.timerStarted = false;
            }

            if (minutes == 0 && seconds <= 0 && seconds > -2) {
                playSound('sounds/a-tone.mp3')
            }

            let timeToShow = minutes + 'm ' + seconds + 's';

            if (minutes == 0) {
                timeToShow = seconds + 's';
            }

            timeSpan.innerHTML = timeToShow
        }, 500)
    }

    // TODO Use these later
    workout.equipment = {
        "thick bar": 25,
        "ez curl bar": 15,
        "bench bar": 45
    }

    workout.data = {
        "routines": [

        ]
    }

    loadWorkoutData($http).then((routines) => {

        workout.data.routines = routines
    }).then(() => {
        let selectBox = document.getElementById("selectBox");

        workout.data.routines.forEach((routine) => {
            let routineMs = routine.endMilliseconds[routine.endMilliseconds.length - 1]
            let ms = getTimeMilliseconds()
            let msSinceWorkout = ms - routineMs;

            let daysSinceLastDoneWorkout = Math.floor(msSinceWorkout / (1000 * 60 * 60) / 24)
            routine.daysAgo = daysSinceLastDoneWorkout

            // TODO can sort by the longest workout ago
            // | orderBy:'daysAgo' | reverse
            let opt1 = document.createElement("option");
            opt1.value = routine.name;
            opt1.text = `${routine.name} - ${routine.daysAgo} Days Ago - ${routine.workoutTime[routine.workoutTime.length-1]}`
            selectBox.add(opt1, null);
        })
        
    })

    workout.start = function(name) {
        // Changes the routine from the id to the whole entity
        // Also created arrays for reps and weight
        workout.started = true
        workout.currentRoutine = workout.data.routines.filter((routine) => routine.name == name)[0]
        workout.currentExerciseId = 0
        workout.exerciseCount = 0
        workout.currentRoutine.startMilliseconds.push(getTimeMilliseconds())
        // var date = new Date(milliseconds);
        // date.toString()
        // Gives you human readable from that

        // Add new rep/weight entries to all exercises of loaded routine
        workout.currentRoutine.exercises.forEach((exercise) => {
            // workout.currentRoutine.exercises[workout.currentExerciseId]
            exercise.reps.push([])
            exercise.weight.push([])
            workout.exerciseCount += 1
        })

        workout.refreshWorkoutData()
    }

    workout.saveItems = function() {
        var currentExercise = workout.currentRoutine.exercises[workout.currentExerciseId]

        // Incase not filled out
        if (workout.currentReps.length !== 0) {
            var repLength = currentExercise.reps.length
            currentExercise.reps[repLength - 1] = workout.currentReps.split(',').map(Number)
        }

        // Incase not filled out
        if (workout.currentWeight.length !== 0) {
            var weightLength = currentExercise.weight.length
            currentExercise.weight[weightLength - 1] = workout.currentWeight.split(',').map(Number)
        }
    }

    workout.refreshWorkoutData = function() {
        workout.previousExerciseData = workout.currentRoutine.exercises[workout.currentExerciseId]

        // Handle first time using routine
        if (workout.previousExerciseData.reps.length > 1) {
            workout.previousExerciseReps = workout.previousExerciseData.reps.slice(Math.max(workout.previousExerciseData.reps.length - 2, 0))[0]
            workout.lastExerciseRep = workout.previousExerciseReps[workout.previousExerciseReps.length - 1]
        } else {
            workout.previousExerciseReps = ""
            workout.lastExerciseRep = ""
        }

        if (workout.previousExerciseData.weight.length > 1) {
            workout.previousExerciseWeight = workout.previousExerciseData.weight.slice(Math.max(workout.previousExerciseData.weight.length - 2, 0))[0]
            workout.lastExerciseWeight = workout.previousExerciseWeight[workout.previousExerciseWeight.length - 1]
        } else {
            workout.previousExerciseWeight = ""
            workout.lastExerciseWeight = ""
        }

        workout.currentExerciseData = workout.currentRoutine.exercises[workout.currentExerciseId]

        // These will be string inputs on page, but array in data model
        workout.currentReps = workout.currentExerciseData.reps.slice(Math.max(workout.currentExerciseData.reps.length - 1, 0))[0].toString()
        workout.currentWeight = workout.currentExerciseData.weight.slice(Math.max(workout.currentExerciseData.weight.length - 1, 0))[0].toString()
    }

    workout.addWeight = function(weight) {
        if (workout.currentWeight != "") {
            workout.currentWeight += ","
        } 

        workout.currentWeight += weight

        // Also restart the timer if not already
        workout.timer()
    }

    workout.addReps = function(reps) {
        if (workout.currentReps != "") {
            workout.currentReps += ","
        } 

        workout.currentReps += reps

        // Also restart the timer if not already
        workout.timer()
    }

    workout.nextExercise = function() {
        // TODO should just disable button if not available
        if (workout.currentExerciseId < workout.exerciseCount - 1) {
            workout.saveItems()
            workout.currentExerciseId += 1
            workout.refreshWorkoutData()
        }
    }

    workout.previousExercise = function() {
        if (workout.currentExerciseId > 0) {
            workout.saveItems()
            workout.currentExerciseId -= 1
            workout.refreshWorkoutData()
        }
    }

    workout.generateJSON = function() {
        // Ensure current page is saved
        workout.saveItems()

        // Show json entry box
        workout.saved = true

        // Add an end time to the workout
        workout.currentRoutine.endMilliseconds.push(getTimeMilliseconds())

        // Add a human readable workout time
        let endMs = workout.currentRoutine.endMilliseconds
        endMs = endMs[endMs.length - 1];

        let startMs = workout.currentRoutine.startMilliseconds
        startMs = startMs[startMs.length - 1];

        let routineMs = endMs - startMs

        workout.currentRoutine.workoutTime.push(millisecondsToMinSeconds(routineMs));

        let date = new Date(endMs);
        workout.currentRoutine.workoutTimeString.push(date.toString());

        // Remove this $$hashKey
        delete workout.currentRoutine["$$hashKey"]
        delete workout.currentRoutine["daysAgo"]

        workout.json = JSON.stringify(workout.currentRoutine)
    }
});

