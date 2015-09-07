<?php
// PHPReadBeans
require_once '../lib/rb.php';
require_once 'connection.php';

$workout = R::findAll( 'workout');
R::close();

$export =  R::exportAll( $workout );
echo json_encode($export);
?>
