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
        $password = $users->validateString($password);

        if ($users->usernameExist($username)) {
            echo json_encode([
                "error" => "User exist"
            ]);
            exit(-1);
        };

        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        echo json_encode($users->insert(["username", "password_hash"], [$username, $password_hash]));

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

    default:
        break;
}
?>