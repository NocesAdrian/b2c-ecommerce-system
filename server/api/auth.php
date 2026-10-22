<?php

$config = getConfig();
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."users.php";
$users = new UserRepository($config["db_path"]);
require_once $service_path."auth.php";
$auth = new Auth($config["db_path"]);
require_once $service_path."sessions.php";
$sessions = new SessionRepository($config["db_path"]);

switch ($requested_route) {

    case "/api/auth":

        $token = $_COOKIE["token"] ?? '';
        $token = $sessions->validateToken($token);

        $token_hash = hash("sha256", $token);
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }

        http_response_code(200);
        echo json_encode([
            "authenticated" => true,
            "user" => $author
        ]);

        exit(0);

    case "/api/auth/login":
        $body = $auth->getJsonBody();

        $username = $body["username"] ?? '';
        $username = $users->validateString($username);
        
        $password = $body["password"] ?? null;
        $password = $users->validatePassword($password);
        
        $remember_me = $body["remember_me"] ?? false;
        $remember_me = $sessions->validateBool($remember_me);

        $author = $users->getCondition(
            ["id", "username", "password_hash", "role_id"],
            ["username", $username, "="]
        );

        if (
            empty($author) ||
            !password_verify($password, $author[0]["password_hash"])
        ) {
            http_response_code(401);
            echo json_encode([
                "error" => "Username or password does not match"
            ]);
            exit(-1);
        }

        unset($author[0]["password_hash"]);

        $token = bin2hex(random_bytes(32));
        $token_hash = hash("sha256", $token);

        $expire_at = $remember_me
            ? time() + (60 * 60 * 24 * 365) // 365 days
            : time() + (60 * 5); // 5 minutes

        $result = $sessions->insert(
            ["user_id","token_hash", "remember_me", "expire_at"],
            [$author[0]["id"], $token_hash, $remember_me, date('Y-m-d H:i:s', $expire_at)]
        );

        if ($result["affected_rows"] < 1) {
            http_response_code(500);
            echo json_encode([
                "error" => "Failed to create session"
            ]);
            exit;
        }

        setcookie("token", $token, [
            "expires" => $expire_at,
            "path" => "/",
            "secure" => true,      // HTTPS only
            "httponly" => true,    // No JavaScript access
            "samesite" => "None"
        ]);

        http_response_code(200);
        echo json_encode([
            "authenticated" => true,
            "user" => $author[0],
        ]);
        
        exit(0);
    
    case "/api/auth/logout":

        $token = $_COOKIE["token"] ?? '';
        $token = $sessions->validateToken($token);

        $token_hash = hash("sha256", $token);

        // Expire the cookie using the same settings as login
        setcookie("token", "", [
            "expires" => time() - 3600,
            "path" => "/",
            "secure" => true,
            "httponly" => true,
            "samesite" => "None"
        ]);

        $sessions->deleteByToken($token_hash);

        http_response_code(200);
        echo json_encode([
            "authenticated" => false,
            "message" => "Logged out successfully"
        ]);

        exit(0);
        
    default:
        break;
}      
?>