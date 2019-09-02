<?php

require_once '../lib/rb.php';
require_once 'connection.php';

$uuid = R::getAll( 'Select UUID()' );
$theuuid = $uuid[0]['UUID()'];

$uuid = R::getAll( 'Select UUID()' );
$theuuid = $uuid[0]['UUID()'];

$uuid = R::getAll( 'Select UUID()' );
$theuuid = $uuid[0]['UUID()'];

$book = R::load( 'personworkout');

foreach( $_POST as $key=>$value ) {
	$book->$key = $value;
}


$book->personworkoutid = $theuuid;
$book->starttime = date("Y-m-d H:i:s");

R::store( $book );
$result = array('uuid' => $theuuid, 'personid' => $book->personid);
echo json_encode($result);
//echo json_encode([{'uuid':$theuuid},{'personid':$book->personid}]);

//echo json_encode({'uuid':$theuuid});

//$id = $_POST["id"];

//$task = R::load( 'tasks', $id );

//foreach( $_POST as $key=>$value ) {
//	$task->$key = $value;
//}

//R::store( $task );

?>
