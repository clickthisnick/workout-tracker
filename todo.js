var app = angular.module("todoApp", []);

app.factory('GetPeople', function($http) {
  var GetPeople = function() {
    this.initialize = function() {
      // Fetch the player from Dribbble
      var url = 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getPeople.php';
      var getPeopleData = $http.get(url);
      var self = this;

      getPeopleData.then(function(response) {
          angular.extend(self, response.data);
        }, function(response) {
          alert("error");
          alert(response);
        });
    };
    this.initialize();
  };
  return (GetPeople);
});

app.factory('GetWorkouts', function($http) {
  var GetWorkouts = function() {
    this.initialize = function() {
      // Fetch the player from Dribbble
      var url = 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getWorkouts.php';
      var getWorkoutData = $http.get(url);
      var self = this;

      getWorkoutData.then(function(response) {
          angular.extend(self, response.data);
        }, function(response) {
          alert("error");
          alert(response);
        });
    };
    this.initialize();
  };
  return (GetWorkouts);
});

app.factory('GetDays', function($http) {
  var GetDays = function(workoutId) {
    this.initialize = function() {
      // Fetch the player from Dribbble
      var theUrl = 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getDays.php';
      var doneUrl = theUrl + '?id=' + workoutId;
      var data = $http.get(doneUrl);
      var self = this;

      data.then(function(response) {
          angular.extend(self, response.data);
        }, function(response) {
          alert("error");
          alert(response);
        });
    };
    this.initialize();
  };
  return (GetDays);
});


app.controller('TodoListController', function($scope, GetPeople,GetWorkouts,GetDays) {

  var workout = this;

  workout.people = new GetPeople();
  workout.workouts = new GetWorkouts();
  workout.exercises = null;
  workout.selectedWorkoutId = null;
  workout.selectedDayId = null;
  workout.workoutData = null;

  workout.selectedPerson = null;
  workout.selectedExercise = {'sets':3,'reps':5,'weight':0,'name':''};
  workout.workoutStarted = false;
  workout.emptyPersonId = -1;


  workout.getDays = function(workoutId){
    workout.days = new GetDays(workoutId);
  }

  workout.createData = function(){
    var activePeople = removeObjectsInJSONArray(workout.people, 'active', false);
    workout.workoutData = createWorkoutData(activePeople,workout.exercises);
  };

  workout.startWorkout = function(workoutdayexerciseid){
    var exercises = workout.getExercises(workoutdayexerciseid);
    exercises.then(function(result) {  // this is only run after $http completes
       workout.exercises = result;
       alert("promise")
       alert("this");
       workout.exercises = exercises;
       alert(exercises);
       alert(workout.exercises);
       workout.selectedExercise = workout.exercises[0];
       alert("there");
       var activePeople = removeObjectsInJSONArray(workout.people, 'active', false);
       workout.selectedPerson = activePeople[0];
    });



    //workout.nextExercise();
  //rkout.nextExercise();
//    workout.nextExercise();
  //  workout.previousExercise();



//    workout.cyclePerson();
//    workout.selectedPerson = activePeople[0];
  //  workout.createData();
  }
  workout.getPersonExerciseData = function(index,property){
    alert(index);
    alert(property);
    alert(JSON.stringify(workout.selectedPerson));
    alert(JSON.stringify(workout.selectedExercise));

  }

  workout.getExercises = function(workoutdayexerciseid){
    $.ajax({
      type: "POST",
      url: "ajax/getExercises.php",
      data: {'id':workoutdayexerciseid},
      datatype: "json",
      success: function(data) {
        var json = eval('(' + data + ')');
        return json;
      }
    });
    return;
  };

  workout.editReps = function(text,index){
    if(text == 'Edit'){

    }
  };

  workout.reps = function(){
    return createReps(11);
  };

  workout.cyclePerson = function(){
    var activePeople = removeObjectsInJSONArray(workout.people, 'active', false);
    workout.selectedPerson = nextObjectInJSONArrayCycle(workout.selectedPerson.id,'id',activePeople);
  };

  workout.findPerson = function(personId) {
    angular.forEach(workout.people, function(person) {
      if (person.id == personId) workout.selectedPerson = person;
    });
  };

  workout.previousExercise = function(){
    var previousExercise = previousObjectInJSONArray(workout.selectedExercise.exerciseId,'exerciseId',workout.exercises);
    if (previousExercise != -1){
      workout.selectedExercise = previousExercise;
    }
  };

  workout.nextExercise = function(){
    var nextExercise = nextObjectInJSONArray(workout.selectedExercise.exerciseId,'exerciseId',workout.exercises);
    if (nextExercise != -1){
      workout.selectedExercise = nextExercise;
    }
  };

  workout.previousWorkouts = [
    {personId:'1',exerciseId:'1',reps:[5,4,3,2,1],weight:[136,146,155,165,175]},
    {personId:'1',exerciseId:'2',reps:[5,5,5,5,5],weight:[135,145,155,165,175]},
    {personId:'2',exerciseId:'1',reps:[5,5,5,4,3],weight:[155,180,205,215,225]},
    {personId:'2',exerciseId:'2',reps:[5,5,5,2,1],weight:[189,200,215,235,245]}
  ];

  workout.addPerson = function() {
    workout.people.push({name:workout.personName, selected:false, active:false});
    workout.todoText = '';
  };

  workout.remaining = function() {
    var count = 0;
    angular.forEach(workout.people, function(person) {
      count += person.selected ? 0 : 1;
    });
    return count;
  };

  workout.archive = function() {
    var oldPeople = workout.people;
    workout.people = [];
    angular.forEach(oldPeople, function(person) {
      if (!person.selected) workout.people.push(person);
    });
  };
});

// Tested
function nextObjectInJSONArrayCycle(value,property,jsonArray){
  // We assume we are getting the jsonArray already sorted
  // We allow recycling through the array
  var arrayIndex = jsonArray.length-1;
  for (i = 0; i <= arrayIndex; i++) {
    if (i == arrayIndex){
      return jsonArray[0];
    }
    else if (value == jsonArray[i][property]){
      return jsonArray[i+1];
    }
  }
  return -1;
}

function nextObjectInJSONArray(value,property,jsonArray){
  // We assume we are getting the jsonArray already sorted
  // We dont't allow recycling through the array
  var arrayIndex = jsonArray.length-1;
  for (i = 0; i <= arrayIndex; i++) {
    if (value == jsonArray[i][property] && i != arrayIndex){
      return jsonArray[i+1];
    }
  }
  return -1;
}


// Tested
function removeObjectsInJSONArray(array, property, value) {
  var arrayCopy = copyJSONArray(array);
  var itemToRemove = [];

  var arrayIndex = array.length-1;
  for (i = 0; i <= arrayIndex; i++) {
    if(array[i][property] == value){
      itemToRemove.push(i);
    }
  }

  itemToRemove.reverse();
  var removeIndex = itemToRemove.length-1;
  for (i = 0; i <= removeIndex; i++) {
    arrayCopy.splice(itemToRemove[i],1);
  }

  return arrayCopy;
}

// Tested
function copyJSONArray(array) {
  var copy = JSON.parse(JSON.stringify(array));
  return copy;
}

function addPropertyToEveyJSONObject(jsonArray,property,value){
  var arrayIndex = jsonArray.length-1;
  for (i = 0; i <= arrayIndex; i++) {
    jsonArray[i][property] = value;
  }
  return jsonArray;
}

function previousObjectInJSONArray(value,property,jsonArray){
  // We assume we are getting the jsonArray already sorted
  // We dont't allow recycling through the array
  var arrayIndex = jsonArray.length-1;
  for (i = 0; i <= arrayIndex; i++) {
    if (value == jsonArray[i][property] && i !== 0){
      return jsonArray[i-1];
    }
  }
  return -1;
}

function createReps(num){
  var json = createEmptyJSONArray(num);
  var arrayIndex = json.length-1;
  for (i = 0; i <= arrayIndex; i++) {
    if(i === 0){
      json[i].name = '/';
    }
    else{
      json[i].name = i;
    }
  }
  return json;
}

function createEmptyJSONArray(num) {
  var data = [];
  for(var i = 0; i < num; i++) {
    data.push({});
  }
  return data;
}

function createEmptyArray(num) {
  if(typeof num === 'string'){
    num = parseInt(num);
  }
  var data = [];
  for(var i = 0; i < num; i++) {
    data.push("");
  }
  alert(data);
  return data;
}

function createWorkoutData(activePeople,exercises){
  var data = [];
  for (var i = 0; i < activePeople.length; i++) {
    for (var x = 0; x < exercises.length; x++) {
      data.push({
      'personId':activePeople[i].id,
      'exerciseId':exercises[x].exerciseid,
      'reps':createEmptyArray(exercises[x].reps),
      'weight':createEmptyArray(exercises[x].reps)}
    );
    }
  }
  return data;
}
