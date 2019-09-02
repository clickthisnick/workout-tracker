<?php

require_once '../lib/rb.php';
require_once 'connection.php';

//Check if already saved


//Select * From personworkoutexercise Where `personworkoutid` = (
//SELECT `personworkoutid` FROM `personworkout` WHERE `personid` = "055ae363-5054-11e5-b607-04014aabd801" and workoutdayid = 'b9952af4-5046-11e5-b607-04014aabd801' order by starttime desc limit 1)



//[{"personid":"055ae363-5054-11e5-b607-04014aabd801","exerciseid":"05c2ca2c-505d-11e5-b607-04014aabd801","reps":[0,0,0,0,0],"weight":[0,0,0,0,0],"$$hashKey":"object:44"},{"personid":"055ae363-5054-11e5-b607-04014aabd801","exerciseid":"9adb655d-5045-11e5-b607-04014aabd801","reps":[0,0,0,0,0],"weight":[0,0,0,0,0]},{"personid":"72429227-5042-11e5-b607-04014aabd801","exerciseid":"05c2ca2c-505d-11e5-b607-04014aabd801","reps":[0,0,0,0,0],"weight":[0,0,0,0,0]},{"personid":"72429227-5042-11e5-b607-04014aabd801","exerciseid":"9adb655d-5045-11e5-b607-04014aabd801","reps":[0,0,0,0,0],"weight":[0,0,0,0,0]}]

//echo ('ha');

$personid = $_POST['personid'];
$workoutdayid = $_POST['workoutdayid'];

//echo($personid);
//echo($workoutdayid);

$beanId = R::getAll( 'SELECT * FROM personworkoutexercise WHERE personworkoutid =
(SELECT personworkoutid FROM personworkout
  WHERE personid = ?
   and workoutdayid = ?
   order by starttime desc limit 1)',
        [$personid,$workoutdayid]
    );

//echo(count($beanId));
for ($i=0; $i < count($beanId); $i++) {
  $beanId[$i]['personid'] = $personid;
}

if (count($beanId) > 0){

  echo json_encode($beanId);

}
else{

  echo('0');
}

//$id = $_POST["id"];

//$task = R::load( 'tasks', $id );

//foreach( $_POST as $key=>$value ) {
//	$task->$key = $value;
//}

//R::store( $task );

?>
