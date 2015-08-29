angular.module('todoApp', [])
  .controller('TodoListController', function() {

    var workout = this;

    workout.people = [
      {personId:'1',name:'Nick', selected:false, active:false},
      {personId:'2',name:'Doug', selected:false, active:false}];

    workout.addPeople = false;
    workout.changePerson = false;
    workout.oldWorkout = '';

    workout.exercises = [
      {exerciseId:'1',name:'Bench Press',sets:5,reps:5},
      {exerciseId:'2',name:'Squat',sets:3,reps:8}
    ];

    workout.selectedPerson = {name:'Person'};
    //workout.selectedPerson = workout.people[0];
    workout.selectedExercise = workout.exercises[0];

    workout.findPerson = function(personId) {
      angular.forEach(workout.people, function(person) {
        if (person.personId == personId) workout.selectedPerson = person;
      });
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
