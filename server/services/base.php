<?php

class BaseRepository 
{
    protected PDO $db;

    protected const ALLOWED_TABLES = [
            "users",
            "products",
            "roles",
            "categories",
            "carts",
            "cart_items",
            "orders",
            "order_items",
            "saved_locations",
        ];

    public function __construct(string $db_path)
    {
        $this->db = require $db_path;
    }

    public function getAll(string $table) : array
    {
        if(!in_array($table, self::ALLOWED_TABLES, true)) {
            http_response_code(404);

            return [
                "error" => "Table not found"
            ];
        }
        try {

            $stmt = $this->db->prepare("SELECT * FROM ".$table.";");
            $stmt->execute();

            return $stmt->fetchAll();

        } catch(PDOException $e) {

            http_response_code(500);

            return [
                "error" => "Failed to retrieve records"
            ];
        }
    }

    public function getByID(int $id, string $table) : array
    {
        if(!in_array($table, self::ALLOWED_TABLES, true)) {
            http_response_code(404);

            return [
                "error" => "Table not found"
            ];
        }
        try {

            $stmt = $this->db->prepare("SELECT * FROM ".$table." WHERE id = :id;");
            $stmt->execute([
                "id" => $id
            ]);

            return [
                $stmt->fetch()
            ];

        } catch(PDOException $e) {

            http_response_code(500);

            return [
                "error" => "Failed to retrieve record"
            ];
        }
    }

    public function deleteByID(int $id, string $table) : array
    {
        if(!in_array($table, self::ALLOWED_TABLES, true)) {
            http_response_code(404);

            return [
                "error" => "Table not found"
            ];
        }
        try {
            $stmt = $this->db->prepare("DELETE FROM ".$table." WHERE id = :id;");
            $stmt->execute([
                "id" => $id
            ]);

            if ($stmt->rowCount() === 0) {
                http_response_code(404);

                return [
                    "error" => "Record not found"
                ];
            }

            return [
                $id
            ];

        } catch(PDOException $e) {
            http_response_code(500);

            return [
                "error" => "Failed to delete record"
            ];
        }
    }
}

?>