<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class UserRepository extends BaseRepository
{
    protected string $table = "users";

    protected array $allowed_fields = 
    [
        "id",
        "role_id",
        "username",
        "password_hash",
        "date_updated",
        "date_created"
    ];

    public function usernameExist(string $username) : bool 
    {
        $stmt = $this->db->prepare("
            SELECT count(*) AS count FROM ".$this->table."
            WHERE username = :username;
        ");

        $stmt->execute([
            "username" => $username
        ]);

        $record = $stmt->fetch();

        return (int)$record["count"] > 0;
    }

    public function countCustomers(): int
    {
        $stmt = $this->db->query("
            SELECT COUNT(*)
            FROM users
            WHERE role_id = 2;
        ");

        return (int) $stmt->fetchColumn();
    }
   
    public function validatePassword(mixed $password): string
    {
        if (!is_string($password) || $password === '') {
            http_response_code(400);

            echo json_encode([
                "error" => "Invalid or missing password"
            ]);

            exit;
        }

        return $password;
    }
}
?>