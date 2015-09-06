<?php
// PHPReadBeans
require_once '../lib/rb.php';


$dayId = $_GET['id'];

$days = R::findAll( 'workoutday',' workoutid = ? ', [ $dayId ]);
R::close();

$export =  R::exportAll( $days );
echo json_encode($export);
?>
