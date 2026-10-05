<?php

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."users.php";
$db = require $db_path;
$users = new UserRepository($db_path);

switch ($requested_route) {
    case "/api/users":
        echo json_encode($users->getAll("users"));
        exit(0);

    case "/api/users/create":
        $body = json_decode(file_get_contents("php://input"), true);
        $username = $body["username"];

        $password = $body["password"];
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        
        $remember_me_token = bin2hex(random_bytes(32));
        $remember_me_token_hash = hash("sha256", $remember_me_token);

        $incremented_id = $users->create(
            $username,
            $password_hash,
            $remember_me_token_hash
        );

        echo json_encode([
            "incremented_id" => $incremented_id,
            "remember_me_token" => $remember_me_token
        ]);

        exit(0);

    default:
        break;
}

if (preg_match("#^/api/users/([0-9]+)$#", $requested_route, $matches)) {
    $id =  $matches[1];
    echo json_encode($users->getByID($id, "users"));
    exit(0);
}

?>