<?php

// ===================== Create Database Connection ========================= //

# dsn = data source name
$host = getenv("DATABASE_HOST") ?: "database";
$database = getenv("DATABASE_NAME") ?: "b2c_ecommerce_db";
$username = getenv("DATABASE_USER") ?: "b2c_app";
$password = getenv("DATABASE_PASSWORD") ?: "b2c_app_local";
$dsn = "mysql:host=".$host.";dbname=".$database.";charset=utf8mb4";

try {
        # PDO = php data objects
        $db = new PDO(
                $dsn,
                $username,
                $password,
                [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
        );
        return $db;
} catch (PDOException $e) {

        http_response_code(500);

        echo json_encode([
                "msg" => "Database connection failed"
        ]);

        exit(1);
}

?>