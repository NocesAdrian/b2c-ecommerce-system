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
            SELECT u.id, d.user_id
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

        public function getByUser(int $user_id) : array
    {
        $stmt = $this->db->prepare
        ("
            SELECT
                o.id,
                o.status,
                o.payment_method,
                o.total,
                o.date_created,
                d.location AS delivery_location,
                (
                    SELECT COALESCE(SUM(oi.quantity), 0)
                    FROM order_items AS oi
                    WHERE oi.order_id = o.id
                ) AS item_count
            FROM orders AS o
            LEFT JOIN delivery_locations AS d
                ON d.user_id = o.location_id
            WHERE o.user_id = ?
            ORDER BY o.date_created DESC, o.id DESC;
        ");

        $stmt->execute([
            $user_id
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getOwned(int $order_id, int $user_id) : array|false
    {
        $stmt = $this->db->prepare
        ("
            SELECT id, status
            FROM orders
            WHERE id = ?
                AND user_id = ?;
        ");
 
        $stmt->execute([
            $order_id,
            $user_id
        ]);
 
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function countAll() : array
    {
        $stmt = $this->db->prepare
        ("
            SELECT COUNT(*) AS total_orders
            FROM orders;
        ");
 
        $stmt->execute();
 
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
 
        return [
            "total_orders" => (int)$row["total_orders"]
        ];
    }

    public function totalRevenue() : array
    {
        $stmt = $this->db->prepare
        ("
            SELECT COALESCE(SUM(total), 0) AS total_revenue
            FROM orders
            WHERE status IN ('paid', 'delivered');
        ");
 
        $stmt->execute();
 
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
 
        return [
            "total_revenue" => (float)$row["total_revenue"]
        ];
    }
    

    public function getAllDetailed() : array
    {
        $stmt = $this->db->prepare
        ("
            SELECT
                o.id,
                o.user_id,
                u.username,
                o.status,
                o.payment_method,
                o.total,
                o.date_created,
                d.location AS delivery_location,
                (
                    SELECT COALESCE(SUM(oi.quantity), 0)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ) AS item_count
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            LEFT JOIN delivery_locations d ON d.user_id = o.location_id
            ORDER BY o.date_created DESC, o.id DESC;
        ");
 
        $stmt->execute();
 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getOrderStatus(int $id) {
        $stmt = $this->db->prepare(
            "SELECT id, status FROM orders WHERE id = ?;"
        );

        $stmt->execute([$id]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>