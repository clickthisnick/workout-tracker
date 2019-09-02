<?php

require_once '../lib/rb.php';
require_once 'connection.php';

$data = R::dispense( 'postdata' );

$data->id = 10;
$data->data = $_POST;
$id = R::store( $data );

//$id = $_POST["id"];

//$task = R::load( 'tasks', $id );

//foreach( $_POST as $key=>$value ) {
//	$task->$key = $value;
//}

//R::store( $task );

?>
