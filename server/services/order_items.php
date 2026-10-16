<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class OrderItemRepository extends BaseRepository
{
    protected string $table = "order_items";

    protected array $allowed_fields = [
        "order_id",
        "product_id",
        "quantity",
        "unit_price"
    ];

    public function add(int $order_id) : array
    {
        $stmt = $this->db->prepare
        ("
            INSERT INTO order_items (order_id, product_id, quantity, unit_price)
            SELECT o.id, p.id, ci.quantity, p.unit_price
            FROM orders AS o
            JOIN carts AS c 
                ON c.user_id = o.user_id
            JOIN cart_items AS ci
                ON ci.cart_id = c.id
            JOIN products AS p
                ON p.id = ci.product_id
            WHERE o.id = ?;
        ");

        $stmt->execute([
            $order_id
        ]);
        
        $rows_affected = (int)$stmt->rowCount();

        return [
            "affected_rows" => $rows_affected
        ];
    }

    public function total_price(int $order_id) : array 
    {
        $stmt = $this->db->prepare
        ("
            SELECT SUM(oi.unit_price * oi.quantity) AS total_price
            FROM orders AS o
            JOIN order_items as oi 
                ON oi.order_id = o.id
            WHERE o.id = ?;
        ");

        $stmt->execute([
            $order_id
        ]);

        $result = $stmt->fetch();
        
        return [
            "total_price" => $result["total_price"] !== null
                ? (float) $result["total_price"]
                : 0
        ];
    }
}
?>