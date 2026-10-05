<?php

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."users.php";
$users = new UserRepository($db_path);

switch ($requested_route) {
    case "/api/users":
        echo json_encode($users->getAll("users"));
        exit(0);

    case "/api/users/create":
        $body = json_decode(file_get_contents("php://input"), true);
        
        $username = $body["username"];
        $password = $body["password"];
        $remember_me = $body["remember_me"];

        if ($username === '' || $password === '') {
            http_response_code(400);
            return [
                "error" => "Failed to create user"
            ];
        }

        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        
        $remember_me_token = null;
        $remember_me_token_hash = null;
        
        if ( $remember_me === true ) {
            $remember_me_token = bin2hex(random_bytes(32));
            $remember_me_token_hash = hash("sha256", $remember_me_token);
        }
        
        $result = $users->create(
            $username,
            $password_hash,
            $remember_me_token_hash
        );

        if ($result["state"] === -1) {
            echo json_encode([
                "result" => $result
            ]);
            exit(-1);
        }

        echo json_encode([
            "result" => $result,
            "remember_me_token" => $remember_me_token
        ]);

        exit(0);

    default:
        break;
}

// ============================ GET BY ID ============================ //

if (preg_match("#^/api/users/([0-9]+)$#", $requested_route, $matches)) {
    $id =  $matches[1];
    $result = $users->getByID($id, "users");
    echo json_encode([
        "result" => $result[0] === false ? null : $result[0]
    ]);
    exit(0);
}

// ============================ DELETE BY ID ============================ //
if (preg_match("#^/api/users/delete/([0-9]+)$#", $requested_route, $matches)) {
    $id =  $matches[1];
    $result = $users->deleteByID($id, "users");
    echo json_encode([
        "result" => $result[0] === false ? null : $result[0]
    ]);
    exit(0);
}
?>