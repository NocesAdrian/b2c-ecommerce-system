<?php

// ================ SERVER THINGS ==================== //
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__."/config.php";
require_once __DIR__."/api/root.php";
require_once __DIR__."/api/users.php";

http_response_code(404);
echo json_encode([
        "error" => "Route not found"
]);

?>