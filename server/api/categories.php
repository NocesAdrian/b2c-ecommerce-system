<?php

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."categories.php";
$users = new CategoryRepository($db_path);

switch ($requested_route) {
    default:
        break;
}

?>