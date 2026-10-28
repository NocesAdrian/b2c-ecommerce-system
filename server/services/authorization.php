<?php

require_once __DIR__ . "/sessions.php";

function requireAuthenticatedUser(SessionRepository $sessions): array
{
    $token = $_COOKIE["token"] ?? "";

    if (!is_string($token) || $token === "") {
        http_response_code(401);
        echo json_encode(["error" => "Session expired or invalid"]);
        exit(-1);
    }

    $token_hash = hash("sha256", $token);
    $author = $sessions->getByToken($token_hash);

    if ($author === false) {
        $sessions->deleteByToken($token_hash);
        http_response_code(401);
        echo json_encode(["error" => "Session expired or invalid"]);
        exit(-1);
    }

    return $author;
}

function requireAdminUser(SessionRepository $sessions): array
{
    $author = requireAuthenticatedUser($sessions);

    if ((int) $author["role_id"] !== 1) {
        http_response_code(403);
        echo json_encode(["error" => "Admins only"]);
        exit(-1);
    }

    return $author;
}
?>
