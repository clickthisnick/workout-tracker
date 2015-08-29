angular.module('todoApp', [])
  .controller('TodoListController', function() {

    var workout = this;

    workout.people = [
      {name:'Nick', selected:false},
      {name:'Doug', selected:false}];

    workout.addPeople = false;

    workout.addTodo = function() {
      workout.people.push({name:workout.todoText, selected:false});
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
