<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class SessionRepository extends BaseRepository
{
    protected string $table = "sessions";

    protected array $allowed_fields = [
        "id",
        "user_id",
        "token_hash",
        "remember_me",
        "expire_at",
        "date_created"
    ];


    public function getByToken(string $token_hash): array|false
    {
        $stmt = $this->db->prepare("
            SELECT
                u.id AS user_id,
                u.role_id,
                u.username
            FROM sessions AS s
            JOIN users AS u ON u.id = s.user_id
            WHERE s.token_hash = :token_hash
            AND s.expire_at > CURRENT_TIMESTAMP
        ");

        $stmt->execute([
            "token_hash" => $token_hash
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function deleteByToken(string $token_hash) : array
    {
        $stmt = $this->db->prepare("
            DELETE FROM sessions
            WHERE token_hash = :token_hash;
        ");

        $stmt->execute([
            "token_hash" => $token_hash
        ]);

        return [
            "affected_rows" => (int)$stmt->rowCount()
        ];
    }

    public function validateToken(mixed $token): string
    {
        if (!is_string($token) || $token === '') {
            http_response_code(401);

            echo json_encode([
                "error" => "Invalid or missing token"
            ]);

            exit(-1);
        }

        return $token;
    }

    public function deleteByExpired(): array
    {
        $stmt = $this->db->prepare("
            DELETE FROM sessions
            WHERE expire_at < CURRENT_TIMESTAMP;
        ");

        $stmt->execute();

        return [
            "affected_rows" => (int)$stmt->rowCount()
        ];
    }

}
?>