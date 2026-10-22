<?php

// ============== IMPLEMENT AUTH LATER ================== //

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."users.php";
require_once $service_path."auth.php";
$users = new UserRepository($db_path);
$auth = new Auth($db_path);

require_once $service_path."sessions.php";
$sessions = new SessionRepository($config["db_path"]);


switch ($requested_route) {
    case "/api/users":

        //$body = $users->getJsonBody();
        echo json_encode($users->getSelected(["id", "role_id", "username", "date_updated", "date_created"]));

        exit(0);

    case "/api/users/create":

        $body = $users->getJsonBody();

        $username = $body["username"] ?? '';
        $password = $body["password"] ?? '';

        $username = $users->validateString($username);
        $password = $users->validatePassword($password);

        if ($users->usernameExist($username)) {
            http_response_code(409);
            echo json_encode([
                "error" => "User exist"
            ]);
            exit(-1);
        };

        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        $result = $users->insert(["username", "password_hash"], [$username, $password_hash]);

        if ($result["affected_rows"] < 1) {
            http_response_code(500);
            echo json_encode([
                "error" => "Failed to Create Account"
            ]);
            exit(-1);
        };

        http_response_code(201);
        echo json_encode($result);

        exit(0);

    case "/api/users/delete":

        $body = $users->getJsonBody();
        $id = $body["id"] ?? '';
        $id = $users->validateID($id, "users");

        echo json_encode($users->delete($id));
        exit(0);

    case "/api/users/customers":
        
        // $body = $users->getJsonBody();
        echo json_encode($users->getCondition(["id", "role_id","username", "date_updated", "date_created"], ["role_id", 2, "="]));
        exit(0);

    case "/api/users/admin":

        //$body = $users->getJsonBody();    
        echo json_encode($users->getCondition(["id", "role_id","username", "date_updated", "date_created"], ["role_id", 1, "="]));
        exit(0);

    case "/api/users/user":
        $token_hash = hash("sha256", $sessions->validateToken($_COOKIE["token"] ?? ''));
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }

        echo json_encode($author);

        exit(0);

    default:
        break;
}
?>