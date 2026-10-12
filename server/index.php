<?php

// ================ SERVER THINGS ==================== //
header("Content-Type: application/json; charset=UTF-8");

set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Internal Server Error"
    ]);
    exit(-1);
});

require_once __DIR__."/config.php";
require_once __DIR__."/api/root.php";

require_once __DIR__."/api/users.php";
require_once __DIR__."/api/categories.php";
require_once __DIR__."/api/products.php";
// require_once __DIR__."/api/carts.php";
// require_once __DIR__."/api/orders.php";
// require_once __DIR__."/api/categories.php";

http_response_code(404);
echo json_encode([
        "error" => "Route not found"
]);

?>