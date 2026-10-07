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
            "affected_row" => (int)$stmt->rowCount(),
        ];
    }

    public function updateByID(
        int $id,
        int $role_id,
        string $username
    ) : array
    {
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
            "affected_row" => (int)$stmt->rowCount(),
        ];
    }

    public function updatePassword(
        int $id,
        string $password_hash
    ): array
    {
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
            "affected_row" => (int)$stmt->rowCount(),
        ];
    }

    public function getEssential() : array
    {
        $stmt = $this->db->prepare("SELECT id, role_id, username FROM users;");
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getCustomers() : array
    {
        $stmt = $this->db->prepare("SELECT id, role_id, username FROM users WHERE role_id = 2;");
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getAdmin() : array
    {
        $stmt = $this->db->prepare("SELECT id, role_id, username FROM users WHERE role_id = 1;");
        $stmt->execute();

        return $stmt->fetchAll();
    }
}

?>