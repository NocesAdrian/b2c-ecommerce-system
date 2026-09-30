<?php

$BASE_API_URI = "/b2c-ecommerce-system";
$BASE_DB_PATH = __DIR__."/db/";

$route = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);

require_once(__DIR__."/api/request.php");

?>