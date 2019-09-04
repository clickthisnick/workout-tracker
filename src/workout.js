var app = angular.module("WorkoutApp", []);

app.controller('WorkoutController', function() {

    var workout = this;

    workout.started = false;

    // TODO Use these later
    workout.equipment = {
        "thick bar": 25,
        "ez curl bar": 15,
        "bench bar": 45
    }

    workout.routines = [
        {
            "id": 1,
            "name": "arms",
            "exercises": [
                {
                    "name": "concentration curl (ez curl bar, seat low)",
                    "reps": [
                        [6,6,5],
                    ],
                    "weight": [
                        [25,30,32.5],
                    ]
                },
                {
                    "name": "thick bar standing curl",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [15],
                    ]
                },
                {
                    "name": "reverse cable curl",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "db incline hammer curls",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "skull crunchers + close grip pres",
                    "reps": [
                        [6,6,6],
                    ],
                    "weight": [
                        [30,30,30],
                    ]
                },
                {
                    "name": "rope cable extension (good form/be careful of hair)",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "bench bent over db kickbacks",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "diamond pushups",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
            ],
        },
        {
            "id": 2,
            "name": "chest/shoulders",
            "exercises": [
                {
                    "name": "bench press",
                    "reps": [
                        [
                            [5,5,5,5],
                            [6,6,6,6],
                        ],
                    ],
                    "weight": [
                        [135,185,205,225],
                        [135,185,190,195],
                    ]
                },
                {
                    "name": "pec fly",
                    "reps": [
                        [6,6,6],
                        [15,9,9],
                    ],
                    "weight": [
                        [115,115,115],
                        [130,115,100],
                    ]
                },
                {
                    "name": "incline db press",
                    "reps": [
                        [],
                        [16,16,9],
                    ],
                    "weight": [
                        [],
                        [35,35,35],
                    ]
                },
                {
                    "name": "dips",
                    "reps": [
                        [],
                        [],
                    ],
                    "weight": [
                        [],
                        [],
                    ]
                },
                {
                    "name": "should press machine",
                    "reps": [
                        [],
                        [6,11,8],
                    ],
                    "weight": [
                        [],
                        [70,55,55],
                    ]
                },
                {
                    "name": "side db raises",
                    "reps": [
                        [],
                        [16,11,12],
                    ],
                    "weight": [
                        [],
                        [12.5,12.5,10],
                    ]
                },
                {
                    "name": "front db raises",
                    "reps": [
                        [],
                        [16,16,16],
                    ],
                    "weight": [
                        [],
                        [12.5,12.5,12.5],
                    ]
                },
                {
                    "name": "db reverse incline flys",
                    "reps": [
                        [],
                        [10,9,8],
                    ],
                    "weight": [
                        [],
                        [10,10,10],
                    ]
                }
            ],
        },
        {
            "id": 3,
            "name": "legs/back",
            "exercises": [
                {
                    "name": "squat",
                    "reps": [
                        [6,6,6,6],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "db lunges",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "leg raises",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "leg press",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "front lat pull down",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "row rear delt 3 holes visible on chest panel",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "db straight leg deadlift",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
                {
                    "name": "back crunch",
                    "reps": [
                        [],
                    ],
                    "weight": [
                        [],
                    ]
                },
            ],
        },
    ]

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
})

