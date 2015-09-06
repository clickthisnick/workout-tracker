<?php

require_once '../lib/rb.php';

$id = $_POST["id"];
$task = R::load( 'tasks', $id ); //reloads our book

$datetime = new DateTime();
//echo $datetime->format('Y-m-d H:i:s');
//echo "hi";

$addTime = '+' . strval($task->reoccuring) . ' day';

$duetime = $datetime->modify($addTime);
//echo $duetime->format('Y-m-d H:i:s');
date_time_set($duetime,0,0,0);
//echo $duetime->format('Y-m-d H:i:s');
$task->due = $datetime->format('Y-m-d H:i:s');
//$task->due = $datetime;
//echo $task->due;
R::store( $task );

?>
