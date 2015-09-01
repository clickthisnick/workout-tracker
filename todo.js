angular.module('todoApp', [])
  .controller('TodoListController', function() {

    var workout = this;

    workout.people = null;
    workout.workouts = null;
    workout.days = null;

    workout.selectedWorkoutId = null;
    workout.selectedDayId = null;

    workout.loadData = function(){
      workout.getPeople();
      workout.getWorkouts();
    }

    workout.getPeople = function(){
        $.ajax({
          type: "POST",
          url: "ajax/getPeople.php",
          datatype: "html",
          success: function(data) {
            var json = eval('(' + data + ')');
            workout.people = json;
        }
    });
    }

    workout.getWorkouts = function(){
        $.ajax({
          type: "POST",
          url: "ajax/getWorkouts.php",
          datatype: "html",
          success: function(data) {
            var json = eval('(' + data + ')');
            workout.workouts = json;
        }
    });
    }

    workout.blankOutDays = function(){
      workout.days = null;
    }

    workout.getDays = function(workoutId){
      alert(workoutId);
      $.ajax({
        type: "POST",
        url: "ajax/getDays.php",
        data: {'id':workoutId},
        datatype: "json",
        success: function(data) {
          var json = eval('(' + data + ')');
          workout.days = json;
      }
  });

}

    //[
  //    {personId:'1',name:'Nick', selected:false, active:false},
  //    {personId:'2',name:'Doug', selected:false, active:false}];

    workout.workoutStarted = false;

    workout.exercises = [
      {exerciseId:'1',name:'Bench Press',sets:5,reps:5},
      {exerciseId:'2',name:'Squat',sets:3,reps:8}
    ];

    workout.emptyPersonId = -1
    workout.selectedPerson = {name:'Person',personId:workout.emptyPersonId};
    workout.selectedExercise = workout.exercises[0];

    workout.currentPersonExerciseInformation = function(){

    };

    workout.createEmptyArray = function(num) {
      return new Array(num);
    }

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


  $('.launchConfirm').on('click', function (e) {
      $('#confirm')
          .modal({ backdrop: 'static', keyboard: false })
          .one('click', '[data-value]', function (e) {
              if($(this).data('value')) {
                  alert('confirmed');
              } else {
                  alert('canceled');
              }
          });
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
