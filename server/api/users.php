<?php

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."users.php";
$users = new UserRepository($db_path);

switch ($requested_route) {
    case "/api/users":
        $body = json_decode(file_get_contents("php://input"), true);
        $users->authAdmin($body);
        echo json_encode($users->getEssential());
        exit(0);

    case "/api/users/create":
        $body = json_decode(file_get_contents("php://input"), true);
        
        $username = $body["username"] ?? '';
        $password = $body["password"] ?? '';
        $remember_me = $body["remember_me"] ?? '';

        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode([
                "error" => "Failed to create user"
            ]);
            exit(-1);
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

        if ($result["status"] === -1) {
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

    case "/api/users/customers":
        $body = json_decode(file_get_contents("php://input"), true);
        $users->authAdmin($body);

        echo json_encode($users->getCustomers());
        exit(0);

    case "/api/users/admin":
        $body = json_decode(file_get_contents("php://input"), true);
        $users->authAdmin($body);
        
        echo json_encode($users->getAdmin());
        exit(0);

    default:
        break;
}

// ============================ GET BY ID ============================ //

if (preg_match("#^/api/users/([0-9]+)$#", $requested_route, $matches)) {
    $id =  (int)$matches[1];

    $body = json_decode(file_get_contents("php://input"), true);
    
    $users->authAdmin($body);

    $result = $users->getByID($id, "users");

    echo json_encode([
        "result" => $result[0] === false ? null : $result[0]
    ]);
    exit(0);
}

// ============================ DELETE BY ID ============================ //
if (preg_match("#^/api/users/delete/([0-9]+)$#", $requested_route, $matches)) {
    $id =  (int)$matches[1];

    $body = json_decode(file_get_contents("php://input"), true);
    
    $users->authUserAdmin($id, $body);

    $result = $users->deleteByID($id, "users");
    
    echo json_encode([
        "result" => $result[0] === false ? null : $result[0]
    ]);
    exit(0);
}

// ============================ UPDATE BY ID ADMIN SIDE ============================ //
if (preg_match("#^/api/users/update/([0-9]+)$#", $requested_route, $matches)) {
    $id =  (int)$matches[1];
    
    $body = json_decode(file_get_contents("php://input"), true);

    $role_id = $body["role_id"] ?? '';
    $username = $body["username"] ?? '';
    
    $users->authAdmin($body);

    if ($username === '') {
        http_response_code(400);
        echo json_encode([
            "error" => "Invalid request"
        ]);
        exit(-1);
    }

    $result = $users->updateByID($id, $role_id, $username);
    echo json_encode([
        "result" => $result
    ]);
    exit(0);
}

// ============================ UPDATE PASSWORD BY ID ============================ //
if (preg_match("#^/api/users/update/password/([0-9]+)$#", $requested_route, $matches)) {
    $id =  (int)$matches[1];
    
    $body = json_decode(file_get_contents("php://input"), true);
    $password = $body["password"] ?? '';

    $users->authUserAdmin($id, $body);

    if ($password === '') {
        http_response_code(400);
        echo json_encode([
            "error" => "Invalid request"
        ]);
        exit(-1);
    }

    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    $result = $users->updatePassword($id, $password_hash);
    echo json_encode([
        "result" => $result
    ]);
    exit(0);
}
?>