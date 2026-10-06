<?php
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class UserRepository extends BaseRepository
{
    public function create(
        string $username,
        string $password_hash,
        ?string $remember_me_token_hash = null
    ) : array
    {
        try {

            $stmt = $this->db->prepare("
                INSERT INTO users (
                    username,
                    password_hash,
                    remember_me_token_hash
                ) 
                VALUES (
                    :username,
                    :password_hash,
                    :remember_me_token_hash
                )
            ");

            $stmt->execute([
                "username" => $username,
                "password_hash" => $password_hash,
                "remember_me_token_hash" => $remember_me_token_hash
            ]);

            return [
                "id" => (int)$this->db->lastInsertId(),
                "status" => 0
            ];

        } catch(PDOException $e) {

            http_response_code(500);

            return [
                "error" => "Failed to create user",
                "status" => -1
            ];
        }
    }

    public function updateByID(
        int $id,
        int $role_id,
        string $username
    ) : array
    {
        try {

            $stmt = $this->db->prepare("
                UPDATE users SET
                    role_id = :role_id,
                    username = :username
                WHERE id = :id;
            ");

            $stmt->execute([
                "role_id" => $role_id,
                "username" => $username,
                "id" => $id
            ]);

            return [
                "id" => $id,
                "status" => 0
            ];

        } catch(PDOException $e) {

            http_response_code(500);

            return [
                "error" => "Failed to update record",
                "status" => -1
            ];
        }
    }

    public function updatePassword(
        int $id,
        string $password_hash
    ): array
    {
        try {
            $stmt = $this->db->prepare("
                UPDATE users
                SET password_hash = :password_hash
                WHERE id = :id;
            ");

            $stmt->execute([
                "password_hash" => $password_hash,
                "id" => $id
            ]);

            return [
                "id" => $id,
                "status" => 0
            ];
        } catch (PDOException $e) {
            http_response_code(500);

            return [
                "error" => "Failed to update password",
                "status" => -1
            ];
        }
    }

    public function getEssential() : array
    {
        try {
            $stmt = $this->db->prepare("SELECT id, role_id, username FROM users;");
            $stmt->execute();

            return $stmt->fetchAll();

        } catch(PDOException $e) {

            http_response_code(500);

            return [
                "error" => "Failed to retrieve records"
            ];
        }
    }

    public function getCustomers() : array
    {
        try {
            $stmt = $this->db->prepare("SELECT id, role_id, username FROM users WHERE role_id = 2;");
            $stmt->execute();

            return $stmt->fetchAll();

        } catch(PDOException $e) {

            http_response_code(500);

            return [
                "error" => "Failed to retrieve records"
            ];
        }
    }

    public function getAdmin() : array
    {
        try {
            $stmt = $this->db->prepare("SELECT id, role_id, username FROM users WHERE role_id = 1;");
            $stmt->execute();

            return $stmt->fetchAll();

        } catch(PDOException $e) {

            http_response_code(500);

            return [
                "error" => "Failed to retrieve records"
            ];
        }
    }
}

?>