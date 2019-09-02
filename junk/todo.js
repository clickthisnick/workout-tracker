var app = angular.module("todoApp", []);
//TODO increase rep databse to 7 could be 100/100
app.factory('Api',function($http){
  return {
    getPeople: function(onSuccuess,onFailure){
      var url = 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getPeople.php';
      $http.get(url).
      success(onSuccuess).
      error(onFailure);
    },
    getOldPeopleWorkoutData: function(onSuccuess,onFailure,activePeople,workoutdayid){

      var jsonData = copyJSONArray(activePeople);
      jsonData = addPropertyToEveyJSONObject(jsonData,'workoutdayid',workoutdayid)

      for (var i = 0; i < jsonData.length; i++) {
        jsonData[i].personid = jsonData[i].personid;
        delete jsonData[i].$$hashKey;
        delete jsonData[i].active;
        delete jsonData[i].name;
        delete jsonData[i].id;

        var params = $.param(jsonData[i]);

        $http({
          url: 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getOldPeopleWorkout.php',
          method: "POST",
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          data: params
        }).success(onSuccuess).
        error(onFailure);
      }
    },
    getWorkouts: function(onSuccuess,onFailure){
      var url = 'http://clickthisnick.com/workout/WorkoutTracker/ajax/getWorkouts.php';
      $http.get(url).
      success(onSuccuess).
      error(onFailure);
    },
    getDays: function(onSuccuess,onFailure,workoutId){
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
    },
    saveWorkout: function(onSuccuess,onFailure,jsonData,personWorkouts,exerciseCount){

    //  alert('watch this');
  //    alert(JSON.stringify(jsonData));
  //    alert(jsonData.length);
  //    alert(JSON.stringify(personWorkouts));
  //    alert(personWorkouts.length);

      if (jsonData.length / exerciseCount != personWorkouts.length){
        return;
      }

      var jsonCopy = copyJSONArray(jsonData);

      for (var i = 0; i < jsonCopy.length; i++) {
        for (var x = 0; x < personWorkouts.length; x++) {
          if(personWorkouts[x].personid == jsonCopy[i].personid){
            jsonCopy[i].personworkoutid = personWorkouts[x].uuid;
            break;
          }
        }

        delete jsonCopy[i].$$hashKey;
        delete jsonCopy[i].id;

        jsonCopy[i].reps = jsonCopy[i].reps.toString();
        jsonCopy[i].weight = jsonCopy[i].weight.toString();
        alert('Saving');
    //    alert(JSON.stringify(jsonCopy[i]));

        var params = $.param(jsonCopy[i]);
  //      alert(params);
        $http({
          url: 'http://clickthisnick.com/workout/WorkoutTracker/ajax/saveWorkout.php',
          method: "POST",
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          data: params
        }).success(onSuccuess).
        error(onFailure);
      }
    },
    startWorkout: function(onSuccuess,onFailure,activePeople,workoutDayId){
      var jsonData = copyJSONArray(activePeople);
      jsonData = addPropertyToEveyJSONObject(jsonData,'workoutdayid',workoutDayId)

      for (var i = 0; i < jsonData.length; i++) {
        jsonData[i].personid = jsonData[i].personid;
        delete jsonData[i].$$hashKey;
        delete jsonData[i].active;
        delete jsonData[i].name;
        delete jsonData[i].id;

        var params = $.param(jsonData[i]);

        $http({
          url: 'http://clickthisnick.com/workout/WorkoutTracker/ajax/startWorkout.php',
          method: "POST",
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          data: params
        }).success(onSuccuess).
        error(onFailure);
      }
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
  workout.personworkoutid = [];
  workout.personReps = null;
  workout.personWeight = null;
  workout.previousWorkoutData = [];

  workout.personExercise = null;

  failureFunction = function(data){
    alert('Error' + data);
  };


  workout.saveWorkout = function(){

    // alert('tt');

    saveFunc = function(data){
    //  alert('saved');
    };

    Api.saveWorkout(saveFunc,failureFunction,workout.workoutData,workout.exercises.length);

  }


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

  startWorkoutFunc = function(data){
    workout.personworkoutid.push(data);
    Api.saveWorkout(saveWorkout,failureFunction,workout.workoutData,workout.personworkoutid,workout.exercises.length);
  };

  saveWorkout = function(data){
  //  alert('saved');
  }

  workout.saveData = function(){
  //  alert('going to save');
    Api.saveWorkout(saveWorkout,failureFunction,workout.workoutData,workout.personworkoutid,workout.exercises.length);
  }

  workout.startWorkout = function(workoutdayexerciseid){

    exerciseFunc = function(data){
      var dataa = convertJSONObjectOfObjectsToJSONArray(data);
      workout.exercises = dataa;
      workout.selectedExercise = workout.exercises[0];
      workout.workoutData = createWorkoutData(activePeople,workout.exercises);
      Api.startWorkout(startWorkoutFunc,failureFunction,activePeople,workout.selectedDayId);

      return;
    };

    Api.getExercises(exerciseFunc,failureFunction,workoutdayexerciseid);
    var activePeople = removeObjectsInJSONArray(workout.people, 'active', false);
    workout.selectedPerson = activePeople[0];

    addPeopleToPreviousExercises = function(data){
      if ( data == 0){
          workout.previousWorkoutData = createWorkoutData(activePeople,workout.exercises);
      }
      else{
        //[{"id":"90","personworkoutexerciseid":"92e3d3c0-569b-11e5-b607-04014aabd801","personworkoutid":"921f2e27-569b-11e5-b607-04014aabd801","exerciseid":"9adb655d-5045-11e5-b607-04014aabd801","reps":"0,0,0,0,0","weight":"0,0,0,0,0"},{"id":"91","personworkoutexerciseid":"92e3447f-569b-11e5-b607-04014aabd801","personworkoutid":"921f2e27-569b-11e5-b607-04014aabd801","exerciseid":"05c2ca2c-505d-11e5-b607-04014aabd801","reps":"0,0,0,0,0","weight":"0,0,0,0,0"}]
        for (var i = 0; i < data.length; i++) {
          delete data[i].id;
          delete data[i].personworkoutexerciseid;
          delete data[i].personworkoutid;
          data[i].reps = data[i].reps.split(",");
          data[i].weight = data[i].weight.split(",");
          workout.previousWorkoutData.push(data[i]);

        }
      }
    }

    Api.getOldPeopleWorkoutData(addPeopleToPreviousExercises,failureFunction,activePeople,workout.selectedDayId);

  }

  workout.createEmptyArray = function(num){
    return createEmptyArray(num);
  }

  workout.findPersonExerciseData = function(){
    var theWorkout = findPersonExerciseData(workout.workoutData,workout.selectedPerson,workout.selectedExercise);
    return theWorkout;
  }

  workout.addWeight = function(key){
    //$('#ChooseReps').modal('hide')
    arrayLength = workout.workoutData.length - 1
    for (var i = 0; i <= arrayLength; i++) {
      var theWorkout = workout.workoutData[i];
      if (theWorkout.personid == workout.selectedPerson.personid && theWorkout.exerciseid == workout.selectedExercise.exerciseid){
        if (key == "Bar"){
          workout.weightTotal += 45;
        }
        else if (key == "EZ Bar"){
          workout.weightTotal += 15;
        }
        else if (key == "x2"){
          workout.weightTotal *= 2;
        }
        else{
          workout.weightTotal += key;
        }
        workout.workoutData[i].weight[workout.weightIndex] = workout.weightTotal;
      }
    }
  }

  workout.addRep = function(key){
    //$('#ChooseReps').modal('hide')
    arrayLength = workout.workoutData.length - 1
    for (var i = 0; i <= arrayLength; i++) {
      var theWorkout = workout.workoutData[i];
      if (theWorkout.personid == workout.selectedPerson.personid && theWorkout.exerciseid == workout.selectedExercise.exerciseid){
        if (workout.numTotal == ""){
          workout.repTotal = key;
          workout.workoutData[i].reps[workout.repIndex] = workout.repTotal
        }
        else{
          workout.repTotal += key;
          workout.workoutData[i].reps[workout.repIndex] = workout.repTotal
        }
      }
    }
  }

  workout.repTotal = "";
  workout.repIndex = "";
  workout.weightIndex = "";
  workout.weightTotal = 0;

  workout.changePersonExerciseCurrentReps = function(index){
    workout.repIndex = index;
    workout.repTotal = "";
    document.getElementById("ChooseReps").showModal();
  }

  workout.changePersonExerciseCurrentWeight = function(index){
    workout.weightIndex = index;
    workout.weightTotal = 0;
    document.getElementById("ChooseWeight").showModal();
  }

  workout.possibleReps = [
    {
      'name':"/",
      'name1':'1',
      'name2':'2',
    },
    {
      'name':"3",
      'name1':'4',
      'name2':'5',
    },
    {
      'name':"6",
      'name1':'7',
      'name2':'8',
    },
    {
      'name':"9",
      'name1':'0',
      'name2':'Delete',
    }
  ]

  workout.possibleWeight = [
    {
      'name':"Bar",
      'name1':'EZ Bar',
      'name2':'x2',
    },
    {
      'name':2.5,
      'name1':5,
      'name2':10,
    },
    {
      'name':25,
      'name1':35,
      'name2':45,
    }
  ]

  workout.cyclePerson = function(){
    var activePeople = removeObjectsInJSONArray(workout.people, 'active', false);
    workout.selectedPerson = nextObjectInJSONArrayCycle(workout.selectedPerson.personid,'personid',activePeople);
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
  var number = Math.round(num/3)
  var json = createEmptyJSONArray(number);
  var arrayIndex = number+3;
  var realIndex = 0
  for (i = 0; realIndex < number; i+=3) {
    alert(i);
    alert(arrayIndex);
    if(i === 0){
      json[realIndex].name = '/';
      json[realIndex].name1 = i+1;
      json[realIndex].name2 = i+2;
    }
    else{
      json[realIndex].name = i;
      json[realIndex].name1 = i+1;
      json[realIndex].name2 = i+2;
    }
    realIndex++;
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

function createWorkoutData(activePeople,exercises){
  var data = [];
  for (var i = 0; i < activePeople.length; i++) {
    for (var x = 0; x < exercises.length; x++) {
      data.push({
        'personid':activePeople[i].personid,
        'exerciseid':exercises[x].exerciseid,
        'reps':createEmptyArray(exercises[x].reps),
        'weight':createEmptyArray(exercises[x].reps)}
      );
    }
  }
  return data;
}
