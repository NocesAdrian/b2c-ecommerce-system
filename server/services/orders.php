<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class OrderRepository extends BaseRepository
{
    protected string $table = "orders";

    protected array $allowed_fields = [
        "id",
        "user_id",
        "location_id",
        "status",
        "payment_method",
        "payment_status",
        "total",
        "date_created",
    ];

    public function add(int $user_id) : array 
    {
        $stmt = $this->db->prepare
        ("
            INSERT INTO orders (user_id, location_id)
            SELECT u.id, d.location_id
            FROM users AS u
            JOIN delivery_locations AS d
                ON d.user_id = u.id
            WHERE u.id = ?;
        ");

        $stmt->execute([
            $user_id
        ]);

        $rows_affected = (int)$stmt->rowCount();

        return [
            "id" => $rows_affected > 0 ? (int)$this->db->lastInsertId() : null,
            "affected_rows" => $rows_affected
        ];
    }

    
}
?>