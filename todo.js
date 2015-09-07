var app = angular.module("todoApp", []);

app.factory('Api',function($http){
  return {
    getPeople: function(onSuccuess,onFailure){
      var database = {};
      var url = 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getPeople.php';
      $http.get(url).
      success(onSuccuess).
      error(onFailure);
    },
    getWorkouts: function(onSuccuess,onFailure){
      var database = {};
      var url = 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getWorkouts.php';
      $http.get(url).
      success(onSuccuess).
      error(onFailure);
    },
    getDays: function(onSuccuess,onFailure,workoutId){
      var database = {};
      var url = 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getDays.php';
      var doneUrl = url + '?id=' + workoutId;
      $http.get(doneUrl).
      success(onSuccuess).
      error(onFailure);
    },
    getExercises: function(onSuccuess,onFailure,workoutdayexerciseid){
      var url = 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getExercises.php';
      var doneUrl = url + '?id=' + workoutdayexerciseid;
      $http.get(doneUrl).
      success(onSuccuess).
      error(onFailure);
    }
  };
})

app.controller('TodoListController', function(Api) {

  var workout = this;

  workout.people = null;
  workout.exercises = null;

  workout.selectedWorkoutId = null;
  workout.selectedDayId = null;
  workout.workoutData = null;
  workout.selectedPerson = null;
  workout.selectedExercise = null;
  workout.workoutStarted = false;
  workout.emptyPersonId = -1;

  workout.personReps = null;
  workout.personWeight = null;

  workout.personExercise = null;

  failureFunction = function(data){
    console.log('Error' + data);
  };

  var init = function(){

    workoutPeopleFunc = function(data){
      var dataa = convertJSONObjectOfObjectsToJSONArray(data);
      var datas = addPropertyToEveyJSONObject(dataa,'active',false)
      workout.people = datas;
    };

    workoutFunc = function(data){
      var dataa = convertJSONObjectOfObjectsToJSONArray(data);
      workout.workouts = dataa;
    };

    Api.getPeople(workoutPeopleFunc,failureFunction);
    Api.getWorkouts(workoutFunc,failureFunction);
  }

  init();

  workout.getDays = function(workoutId){

    daysFunc = function(data){
      var dataa = convertJSONObjectOfObjectsToJSONArray(data);
      workout.days = dataa;
    };

    Api.getDays(daysFunc,failureFunction,workoutId);
  }

  workout.startWorkout = function(workoutdayexerciseid){

    exerciseFunc = function(data){
      var dataa = convertJSONObjectOfObjectsToJSONArray(data);
      workout.exercises = dataa;
      workout.selectedExercise = workout.exercises[0];
      workout.workoutData = createWorkoutData(activePeople,workout.exercises);
      return;
      };

    Api.getExercises(exerciseFunc,failureFunction,workoutdayexerciseid);
    var activePeople = removeObjectsInJSONArray(workout.people, 'active', false);
    workout.selectedPerson = activePeople[0];
  }

  workout.createEmptyArray = function(num){
    return createEmptyArray(num);
  }

  workout.findPersonExerciseData = function(){
    var theWorkout = findPersonExerciseData(workout.workoutData,workout.selectedPerson,workout.selectedExercise);
    return theWorkout;
  }

  workout.addRep = function(num){
    $('#ChooseReps').modal('hide')
    arrayLength = workout.workoutData.length - 1
    for (var i = 0; i <= arrayLength; i++) {
      var theWorkout = workout.workoutData[i];
      if (theWorkout.personid == workout.selectedPerson.id && theWorkout.exerciseid == workout.selectedExercise.exerciseid){
        workout.workoutData[i].reps[workout.repIndex] = num;
        workout.repIndex = null;
        }
      }
  }

  workout.changePersonExerciseCurrentReps = function(index){
    workout.repIndex = index;
    document.getElementById("ChooseReps").showModal();
    }

  workout.changePersonExerciseCurrentWeight = function(index){
    arrayLength = workout.workoutData.length - 1
    for (var i = 0; i <= arrayLength; i++) {
      var theWorkout = workout.workoutData[i];
      if (theWorkout.personid == workout.selectedPerson.id && theWorkout.exerciseid == workout.selectedExercise.exerciseid){
        workout.workoutData[i].weight[index] = 100;
        return;
      }
    }
  }

/*
  workout.getPersonRepsWeight = function(){
    var theWorkout = workout.findPersonExerciseData();
    alert('get person');
    alert(JSON.stringify(theWorkout));
    workout.personReps = theWorkout.reps;
    workout.personWeight = theWorkout.weight;
  }
  */

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

  workout.previousExercise = function(){
    var previousExercise = previousObjectInJSONArray(workout.selectedExercise.exerciseid,'exerciseid',workout.exercises);
    if (previousExercise != -1){
      workout.selectedExercise = previousExercise;
      return;
    }
    return;
  };

  workout.nextExercise = function(){
    var nextExercise = nextObjectInJSONArray(workout.selectedExercise.exerciseid,'exerciseid',workout.exercises);
    if (nextExercise != -1){
      workout.selectedExercise = nextExercise;
    }
    return;
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
    data.push(0);
  }
  return data;
}

function convertJSONObjectOfObjectsToJSONArray(JSONObject){
  var key, count = 0;
  for(key in JSONObject) {
    if(JSONObject.hasOwnProperty(key)) {
      count++;
    }
  }

  var jsonArray = []
  for (var i = 0; i < count; i++) {
    jsonArray.push(JSONObject[i]);
  }
  return jsonArray;
}

/*
function findPersonExerciseData(workoutData,selectedPerson,selectedExercise){
  arrayLength = workoutData.length - 1
  for (var i = 0; i <= arrayLength; i++) {
    if (workoutData[i].personid == selectedPerson.id && workoutData[i].exerciseid == selectedExercise.exerciseid){
      return workoutData[i];
    }
  }
}
*/

function createWorkoutData(activePeople,exercises){
  var data = [];
  for (var i = 0; i < activePeople.length; i++) {
    for (var x = 0; x < exercises.length; x++) {
      data.push({
        'personid':activePeople[i].id,
        'exerciseid':exercises[x].exerciseid,
        'reps':createEmptyArray(exercises[x].reps),
        'weight':createEmptyArray(exercises[x].reps)}
      );
    }
  }
  return data;
}

function sweetaalert(){
  alert('hiherealert');
  swal({   title: "An input!",
  text: "Write something interesting:",
  type: "input",
  showCancelButton: true,
  closeOnConfirm: false,
  animation: "slide-from-top",
  inputPlaceholder: "Write something" },
  function(inputValue){
     if (inputValue === false) return false;
       if (inputValue === "")
       {     swal.showInputError("You need to write something!");
        return false   }
           swal("Nice!", "You wrote: " + inputValue, "success"); });

}
