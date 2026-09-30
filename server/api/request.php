<?php
header("Content-Type: application/json; charset=UTF-8");

switch ($route) {
    case $BASE_API_URI."/api/users":
        require_once(__DIR__."/users/get.php");
        exit(0);
    
    case $BASE_API_URI."api/users/create":
        require_once(__DIR__."/users/create.php");
        exit(0);
    
    default:
        break;
}

// =================== USERS OPERATION ==================== // 
if (preg_match("#^".$BASE_API_URI."/api/users/([0-9]+)$#", $route, $matches)) {
    $id =  $matches[1];
    require_once(__DIR__."/users/get-by-id.php");
    exit(0);
}

if (preg_match("#^".$BASE_API_URI."/api/users/delete/([0-9]+)$#", $route, $matches)) {
    $id =  $matches[1];
    require_once(__DIR__."/users/get-by-id.php");
    exit(0);
}

if (preg_match("#^".$BASE_API_URI."/api/users/update/([0-9]+)$#", $route, $matches)) {
    $id =  $matches[1];
    require_once(__DIR__."/users/get-by-id.php");
    exit(0);
}

http_response_code(404);

echo json_encode([
    "error" => "Route not found"
]);

?>