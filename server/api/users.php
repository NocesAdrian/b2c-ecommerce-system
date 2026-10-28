<?php

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."users.php";
$users = new UserRepository($db_path);

require_once $service_path."sessions.php";
$sessions = new SessionRepository($config["db_path"]);
require_once $service_path."authorization.php";


switch ($requested_route) {
    case "/api/users":

        requireAdminUser($sessions);

        echo json_encode($users->getSelected(["id", "role_id", "username", "date_updated", "date_created"]));

        exit(0);

    // Public sign-up: always creates a CUSTOMER (role_id defaults to 2).
    // Never accept role_id here, or anyone could make themselves an admin.
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

    case "/api/users/profile/update":

        $author = requireAuthenticatedUser($sessions);
        $body = $users->getJsonBody();
        $user_id = (int) $author["user_id"];
        $current = $users->get($user_id);
        $username = $users->validateString($body["username"] ?? $current["username"]);

        if (mb_strlen($username) < 4 || mb_strlen($username) > 255) {
            http_response_code(400);
            echo json_encode(["error" => "Username must contain between 4 and 255 characters"]);
            exit(-1);
        }

        if ($username !== $current["username"] && $users->usernameExist($username)) {
            http_response_code(409);
            echo json_encode(["error" => "User exist"]);
            exit(-1);
        }

        $fields = ["username"];
        $values = [$username];
        $new_password = $body["new_password"] ?? "";

        if ($new_password !== "") {
            $current_password = $users->validatePassword($body["current_password"] ?? null);

            if (!password_verify($current_password, $current["password_hash"])) {
                http_response_code(400);
                echo json_encode(["error" => "Current password is incorrect"]);
                exit(-1);
            }

            $new_password = $users->validatePassword($new_password);

            if (strlen($new_password) < 4) {
                http_response_code(400);
                echo json_encode(["error" => "New password must contain at least 4 characters"]);
                exit(-1);
            }

            $fields[] = "password_hash";
            $values[] = password_hash($new_password, PASSWORD_DEFAULT);
        }

        $users->update($fields, $values, $user_id);
        http_response_code(200);
        echo json_encode(["username" => $username]);

        exit(0);

    // ADDED: admin only. Change username, role and (optionally) password.
    // Body: { "id": 5, "username": "ana", "role_id": 2, "password": "optional" }
    case "/api/users/update":

        $author = requireAdminUser($sessions);
        $body = $users->getJsonBody();

        $id = $users->validateID($body["id"] ?? '', "users");
        $username = $users->validateString($body["username"] ?? '');
        $role_id = $users->validateID($body["role_id"] ?? '', "roles");

        $current = $users->get($id);

        if (!$current) {
            http_response_code(404);
            echo json_encode(["error" => "User not found"]);
            exit(-1);
        }

        // the new username must not belong to someone else
        if ($username !== $current["username"] && $users->usernameExist($username)) {
            http_response_code(409);
            echo json_encode(["error" => "User exist"]);
            exit(-1);
        }

        // an admin can't remove their own admin role (avoids locking everyone out)
        if ($id === (int)$author["user_id"] && $role_id !== 1) {
            http_response_code(409);
            echo json_encode(["error" => "You can't remove your own admin role"]);
            exit(-1);
        }

        $fields = ["username", "role_id"];
        $values = [$username, $role_id];

        // password is optional: only changed when a new one is sent
        $password = $body["password"] ?? '';

        if ($password !== '') {
            $password = $users->validatePassword($password);
            $fields[] = "password_hash";
            $values[] = password_hash($password, PASSWORD_DEFAULT);
        }

        echo json_encode($users->update($fields, $values, $id));

        exit(0);

    case "/api/users/delete":

        $author = requireAdminUser($sessions);
        $body = $users->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $users->validateID($id, "users");

        // ADDED: an admin can't delete their own account
        if ($id === (int)$author["user_id"]) {
            http_response_code(409);
            echo json_encode(["error" => "You can't delete your own account"]);
            exit(-1);
        }

        echo json_encode($users->delete($id));
        exit(0);

    case "/api/users/customers":

        requireAdminUser($sessions);

        echo json_encode($users->getCondition(["id", "role_id","username", "date_updated", "date_created"], ["role_id", 2, "="]));
        exit(0);

    case "/api/users/admin":

        requireAdminUser($sessions);

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