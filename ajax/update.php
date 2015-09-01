<?php

require_once '../lib/rb.php';


$id = $_POST["id"];

$task = R::load( 'tasks', $id );

foreach( $_POST as $key=>$value ) {
	$task->$key = $value;
}

R::store( $task );

?>
