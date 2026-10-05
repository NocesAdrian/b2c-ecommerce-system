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
                "state" => 0
            ];

        } catch(PDOException $e) {

            http_response_code(500);

            return [
                "error" => "Failed to create user",
                "state" => -1
            ];
        }
    }
}

?>