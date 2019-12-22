var app = angular.module("WorkoutApp", []);

app.controller('WorkoutController', function($http) {

    var workout = this;

    workout.started = false;

    // TODO Use these later
    workout.equipment = {
        "thick bar": 25,
        "ez curl bar": 15,
        "bench bar": 45
    }

    $http.get('workout.json').success(function (data){
		workout.routines = data;
    });

    workout.start = function(id) {
        // Changes the routine from the id to the whole entity
        // Also created arrays for reps and weight

        workout.started = true
        workout.currentRoutineId = id - 1
        workout.currentExerciseId = 0

        workout.previous = []
        workout.current = []

        workout.routines[workout.currentRoutineId].exercises.forEach((exercise) => {
            workout.previous.push(
                {
                    "name": exercise.name,
                    "reps": exercise.reps.slice(Math.max(exercise.reps.length - 1, 0))[0],
                    "weight": exercise.weight.slice(Math.max(exercise.weight.length - 1, 0))[0],
                }
            )
            workout.current.push(
                {
                    "name": exercise.name,
                    "reps": [],
                    "weight": [],
                }
            )
        })

        workout.loadItems()
    }

    workout.saveItems = function() {
        if (workout.currentWeight !== 0) {
            workout.current[workout.currentExerciseId].weight = workout.currentWeight.split(',')
        }

        if (workout.currentReps !== 0) {
            workout.current[workout.currentExerciseId].reps = workout.currentReps.split(',')
        }
    }

    workout.loadItems = function() {
        if (workout.current[workout.currentExerciseId].weight.length !== 0) {
            workout.currentWeight = workout.current[workout.currentExerciseId].weight.join(',')
        } else {
            workout.currentWeight = ""
        }

        if (workout.current[workout.currentExerciseId].reps.length !== 0) {
            workout.currentReps = workout.current[workout.currentExerciseId].reps.join(',')
        } else {
            workout.currentReps = ""
        }
    }

    workout.nextExercise = function() {
        if (workout.currentExerciseId < workout.current.length - 1) {
            workout.saveItems()
            workout.currentExerciseId += 1
            workout.loadItems()
        }
    }

    workout.previousExercise = function() {
        if (workout.currentExerciseId > 0) {
            workout.saveItems()
            workout.currentExerciseId -= 1
            workout.loadItems()
        }
    }

    // workout.generatejson = function() {

    // }
})

