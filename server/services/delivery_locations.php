<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class DeliveryLocationRepository extends BaseRepository
{
    protected string $table = "delivery_locations";

    protected array $allowed_fields = [
        "user_id",
        "location",
        "date_updated"
    ];

    public function saveForUser(int $user_id, string $location): array
    {
        $stmt = $this->db->prepare("
            INSERT INTO delivery_locations (user_id, location)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE location = VALUES(location);
        ");
        $stmt->execute([$user_id, $location]);

        return ["affected_rows" => (int) $stmt->rowCount()];
    }

    public function getForUser(int $user_id): array|false
    {
        $stmt = $this->db->prepare("
            SELECT user_id, location, date_updated
            FROM delivery_locations
            WHERE user_id = ?;
        ");
        $stmt->execute([$user_id]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function deleteForUser(int $user_id): array
    {
        $stmt = $this->db->prepare("
            DELETE FROM delivery_locations
            WHERE user_id = ?;
        ");
        $stmt->execute([$user_id]);

        return ["affected_rows" => (int) $stmt->rowCount()];
    }
}
?>