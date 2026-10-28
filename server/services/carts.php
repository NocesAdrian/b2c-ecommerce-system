<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class CartRepository extends BaseRepository
{
    protected string $table = "carts";

    protected array $allowed_fields = [
        "id",
        "user_id",
        "date_created"
    ];

    public function ensureForUser(int $user_id): array
    {
        $stmt = $this->db->prepare("
            INSERT INTO carts (user_id)
            VALUES (?)
            ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
        ");
        $stmt->execute([$user_id]);

        return [
            "id" => (int) $this->db->lastInsertId()
        ];
    }
}
?>