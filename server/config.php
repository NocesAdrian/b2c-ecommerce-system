<?php 

function getConfig() : array {
    return [
        "requested_route" => parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH),
        "db_path" => __DIR__."/db/conn.php",
        "services_path" => __DIR__."/services/"
    ];
}

?>