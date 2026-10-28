<?php

// ================ SERVER THINGS ==================== //
header("Content-Type: application/json; charset=UTF-8");
// Match the requesting origin exactly; credentialed CORS cannot use multiple
// Access-Control-Allow-Origin headers or a wildcard.
$allowed_origins = [
    "https://nocesadrian.github.io",
    "https://adriannoces.free.je",
    "http://127.0.0.1:5500",
    "http://localhost:5500"
];
$configured_origins = getenv("CLIENT_ORIGINS") ?: getenv("CLIENT_ORIGIN") ?: "";
if (trim($configured_origins) !== "") {
    $allowed_origins = array_merge(
        $allowed_origins,
        array_filter(array_map("trim", explode(",", $configured_origins)))
    );
}
$allowed_origins = array_unique($allowed_origins);
$request_origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (in_array($request_origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: ".$request_origin);
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

set_exception_handler(function (Throwable $e) {
    error_log((string) $e);
    http_response_code(500);
    echo json_encode([
        "error" => "Internal Server Error"
    ]);
    exit(-1);
});

// Handle preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__."/config.php";
require_once __DIR__."/api/root.php";

require_once __DIR__."/api/users.php";
require_once __DIR__."/api/categories.php";
require_once __DIR__."/api/products.php";
require_once __DIR__."/api/auth.php";
require_once __DIR__."/api/delivery_locations.php";
require_once __DIR__."/api/carts.php";
require_once __DIR__."/api/orders.php";
require_once __DIR__."/api/customer_service.php";
// require_once __DIR__."/api/categories.php";

http_response_code(404);
echo json_encode([
        "error" => "Route not found"
]);

?>