<?php

// ===================== Create Database Connection ========================= //

# dsn = data source name
$dsn = "mysql:host=database;dbname=b2c_ecommerce_db;charset=utf8mb4";

try {
        # PDO = php data objects
        $db = new PDO(
                $dsn,
                "noces",
                "Admin123",
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