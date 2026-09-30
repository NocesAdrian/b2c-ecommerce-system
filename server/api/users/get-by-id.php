<?php

header("Content-Type: application/json; charset=UTF-8");

$db = require_once($BASE_DB_PATH."conn.php");

$stmt = $db->prepare("SELECT * FROM users WHERE id = :id");
$stmt->execute([
    "id"=> $id,
]);

$users = $stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode($users);

?>