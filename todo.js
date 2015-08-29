angular.module('todoApp', [])
  .controller('TodoListController', function() {

    var workout = this;

    workout.people = [
      {personId:'1',name:'Nick', selected:false, active:false},
      {personId:'2',name:'Doug', selected:false, active:false}];

    workout.addPeople = false;

    workout.exercises = [
      {exerciseId:'1',name:'Bench Press',sets:5,reps:5},
      {exerciseId:'2',name:'Squat',sets:3,reps:8}
    ];

    workout.emptyPersonId = -1
    workout.selectedPerson = {name:'Person',personId:workout.emptyPersonId};
    workout.selectedExercise = workout.exercises[0];

    workout.cyclePerson = function(){
      var activePeople = removeObjectsInJSONArray(workout.people, 'active', false);
      if (workout.selectedPerson.personId == workout.emptyPersonId){
        workout.selectedPerson = activePeople[0];
      }
      else{
        var person = nextObjectInJSONArrayCycle(workout.selectedPerson.personId,'personId',activePeople)
        workout.selectedPerson = person;
      }
    }

    workout.findPerson = function(personId) {
      angular.forEach(workout.people, function(person) {
        if (person.personId == personId) workout.selectedPerson = person;
      });
    }

    workout.previousExercise = function(){
      var previousExercise = previousObjectInJSONArray(workout.selectedExercise.exerciseId,'exerciseId',workout.exercises);
      if (previousExercise != -1){
        workout.selectedExercise = previousExercise;
      }
    }

    workout.nextExercise = function(){
      var nextExercise = nextObjectInJSONArray(workout.selectedExercise.exerciseId,'exerciseId',workout.exercises);
      if (nextExercise != -1){
        workout.selectedExercise = nextExercise;
      }
    }

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
      return -1
    };

function nextObjectInJSONArray(value,property,jsonArray){
  // We assume we are getting the jsonArray already sorted
  // We dont't allow recycling through the array
    var arrayIndex = jsonArray.length-1;
    for (i = 0; i <= arrayIndex; i++) {
        if (value == jsonArray[i][property] && i != arrayIndex){
          return jsonArray[i+1];
      }
    }
    return -1
  };

  function removeObjectsInJSONArray(array, property, value) {
    var arrayCopy = array.slice();

    var arrayIndex = arrayCopy.length-1;
    for (i = 0; i <= arrayIndex; i++) {
      if(arrayCopy[i][property] == value){
        arrayCopy.splice(i, 1);
      }
    }
     return arrayCopy;
  }

  function previousObjectInJSONArray(value,property,jsonArray){
    // We assume we are getting the jsonArray already sorted
    // We dont't allow recycling through the array
      var arrayIndex = jsonArray.length-1;
      for (i = 0; i <= arrayIndex; i++) {
        if (value == jsonArray[i][property] && i != 0){
          return jsonArray[i-1];
        }
      }
      return -1
    };
