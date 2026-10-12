<?php 

function getConfig() : array {
    return [
        "requested_route" => parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH),
        "root" => __DIR__,
        "db_path" => __DIR__."/db/conn.php",
        "services_path" => __DIR__."/services/",
        "storage_path" => __DIR__."/storage/",
        "default_product_image" => __DIR__."/storage/default/images/default.jpg"
    ];
}

?>