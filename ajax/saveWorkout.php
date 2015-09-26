<?php

require_once '../lib/rb.php';
require_once 'connection.php';

//Check if already saved
$exerciseid = $_POST['exerciseid'];
$personworkoutid = $_POST['personworkoutid'];

$beanId = R::getAll( 'SELECT id FROM personworkoutexercise WHERE personworkoutid = ? AND exerciseid = ?',
        [$personworkoutid,$exerciseid]
    );

if (count($beanId) > 0){

  $theId = $beanId[0]['id'];


  $update = R::load( 'personworkoutexercise',$theId);

  foreach( $_POST as $key=>$value ) {
  	$update->$key = $value;
  }

  R::store( $update );

}
else{

  $firstSave = R::load( 'personworkoutexercise');

  $uuid = R::getAll( 'Select UUID()' );
  $theuuid = $uuid[0]['UUID()'];

  $uuid = R::getAll( 'Select UUID()' );
  $theuuid = $uuid[0]['UUID()'];

  $uuid = R::getAll( 'Select UUID()' );
  $theuuid = $uuid[0]['UUID()'];

  foreach( $_POST as $key=>$value ) {
  	$firstSave->$key = $value;
  }

  $firstSave->personworkoutexerciseid = $theuuid;

  R::store( $firstSave );

}

//$id = $_POST["id"];

//$task = R::load( 'tasks', $id );

//foreach( $_POST as $key=>$value ) {
//	$task->$key = $value;
//}

//R::store( $task );

?>
