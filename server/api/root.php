<?php

$config = getConfig();
$requested_route = $config["requested_route"];

switch ($requested_route) {
    case "/":
        echo json_encode([
            "message" => "Welcome to b2c ecommerce server",
            "get-all" => [
                    "users" => "/api/users",
                    "products" => "/api/products"
            ]
        ]);
        exit(0);
            
    default:
        break;
}


?>