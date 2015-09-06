<?php
// PHPReadBeans
require_once '../lib/rb.php';

$workoutdayid = $_GET["id"];
$exercises = R::getAll( 'SELECT * FROM workoutdayexercise
  Join exercise on exercise.id = workoutdayexercise.exerciseid
   Where workoutdayid = :workoutdayid
   Order by sequence',
[':workoutdayid' => $workoutdayid  ]);

echo json_encode($exercises);

?>
