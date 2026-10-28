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

    public function markPaid(int $order_id, ?int $user_id = null): array
    {
        $this->db->beginTransaction();

        try {
            $sql = "SELECT status FROM orders WHERE id = ?";
            $params = [$order_id];

            if ($user_id !== null) {
                $sql .= " AND user_id = ?";
                $params[] = $user_id;
            }

            $stmt = $this->db->prepare($sql . " FOR UPDATE");
            $stmt->execute($params);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($order === false) {
                $this->db->rollBack();
                return ["status" => "not_found"];
            }

            if ($order["status"] !== "pending") {
                $this->db->rollBack();
                return ["status" => "not_pending"];
            }

            $stmt = $this->db->prepare("
                SELECT product_id, quantity
                FROM order_items
                WHERE order_id = ?
                ORDER BY product_id;
            ");
            $stmt->execute([$order_id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($items)) {
                $this->db->rollBack();
                return ["status" => "empty_order"];
            }

            $decrement = $this->db->prepare("
                UPDATE products
                SET stocks = stocks - ?
                WHERE id = ?
                    AND stocks >= ?;
            ");

            foreach ($items as $item) {
                $product_id = $item["product_id"];
                $quantity = (int) $item["quantity"];

                if ($product_id === null) {
                    $this->db->rollBack();
                    return ["status" => "out_of_stock", "product_id" => null];
                }

                $decrement->execute([$quantity, $product_id, $quantity]);

                if ($decrement->rowCount() !== 1) {
                    $this->db->rollBack();
                    return [
                        "status" => "out_of_stock",
                        "product_id" => (int) $product_id
                    ];
                }
            }

            $stmt = $this->db->prepare("
                UPDATE orders
                SET status = 'paid', paid_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'pending';
            ");
            $stmt->execute([$order_id]);

            if ($stmt->rowCount() !== 1) {
                $this->db->rollBack();
                return ["status" => "not_pending"];
            }

            $this->db->commit();
            return ["status" => "paid"];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    public function getDashboardSales(): array
    {
        $stmt = $this->db->query("
            SELECT
                CURDATE() AS dashboard_date,
                COALESCE(SUM(CASE
                    WHEN paid_at >= CURDATE()
                        AND paid_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                    THEN total ELSE 0
                END), 0) AS today_sales,
                COALESCE(SUM(CASE
                    WHEN paid_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                        AND paid_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                    THEN total ELSE 0
                END), 0) AS week_sales,
                COALESCE(SUM(CASE
                    WHEN paid_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                        AND paid_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                    THEN total ELSE 0
                END), 0) AS month_sales,
                COALESCE(SUM(total), 0) AS total_revenue,
                COUNT(*) AS paid_orders,
                COALESCE(SUM(CASE
                    WHEN paid_at >= CURDATE()
                        AND paid_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                    THEN 1 ELSE 0
                END), 0) AS paid_orders_today
            FROM orders
            WHERE status IN ('paid', 'delivered')
                AND paid_at IS NOT NULL;
        ");
        $sales = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->query("
            SELECT COUNT(*)
            FROM orders
            WHERE status = 'pending';
        ");
        $sales["pending_orders"] = (int) $stmt->fetchColumn();

        $stmt = $this->db->query("
            SELECT
                DATE(paid_at) AS sale_date,
                SUM(total) AS sales
            FROM orders
            WHERE status IN ('paid', 'delivered')
                AND paid_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                AND paid_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
            GROUP BY DATE(paid_at)
            ORDER BY sale_date;
        ");
        $sales["daily_sales"] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $this->db->query("
            SELECT
                oi.name,
                SUM(oi.quantity) AS units_sold,
                SUM(oi.quantity * oi.unit_price) AS sales
            FROM order_items AS oi
            JOIN orders AS o ON o.id = oi.order_id
            WHERE o.status IN ('paid', 'delivered')
                AND o.paid_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
                AND o.paid_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
            GROUP BY oi.name
            ORDER BY units_sold DESC, sales DESC, oi.name
            LIMIT 5;
        ");
        $sales["top_products"] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ([
            "today_sales",
            "week_sales",
            "month_sales",
            "total_revenue"
        ] as $amount) {
            $sales[$amount] = (float) $sales[$amount];
        }

        foreach (["paid_orders", "paid_orders_today", "pending_orders"] as $count) {
            $sales[$count] = (int) $sales[$count];
        }

        return $sales;
    }
}
?>