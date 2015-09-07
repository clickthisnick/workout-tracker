<?php
// PHPReadBeans
require_once '../lib/rb.php';
require_once 'connection.php';

$people = R::findAll( 'person');

R::close();

$export =  R::exportAll( $people );
echo json_encode($export);

?>
