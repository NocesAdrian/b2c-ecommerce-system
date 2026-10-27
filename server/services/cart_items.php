<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class CartItemRepository extends BaseRepository
{
    protected string $table = "cart_items";

    protected array $allowed_fields = [
        "cart_id",
        "product_id",
        "quantity",
        "date_updated",
    ];

    public function updateQuantity(
        int $cartID,
        int $productID,
        int $quantity
    ): array {
        $stmt = $this->db->prepare("
            UPDATE " . $this->table . "
            SET quantity = :quantity
            WHERE cart_id = :cart_id
            AND product_id = :product_id;
        ");

        $stmt->execute([
            "quantity" => $quantity,
            "cart_id" => $cartID,
            "product_id" => $productID
        ]);

        return [
            "affected_rows" => (int) $stmt->rowCount()
        ];
    }

    public function deleteCartItems(int $cartID, int $productID) : array 
    {
        
        $stmt = $this->db->prepare
        ("
            DELETE FROM ".$this->table."
            WHERE cart_id = :cart_id 
            AND product_id = :product_id;
        ");
        $stmt->execute([
            "cart_id" => $cartID,
            "product_id" => $productID
        ]);

        return [
            "affected_rows" => (int)$stmt->rowCount()
        ];
    }

    public function getItem(int $cartID, int $productID): array|false
    {
        $stmt = $this->db->prepare("
            SELECT * FROM " . $this->table . "
            WHERE cart_id = :cart_id
            AND product_id = :product_id;
        ");

        $stmt->execute([
            "cart_id" => $cartID,
            "product_id" => $productID
        ]);

        $record = $stmt->fetch();

        return $record;
    }

    public function getUserItems(int $userID): array
    {
        $stmt = $this->db->prepare("
            SELECT
                p.id AS product_id,
                p.name AS product_name,
                ci.quantity AS product_quantity,
                p.unit_price AS product_price,
                p.image_path AS image_path
            FROM
                cart_items AS ci
            JOIN 
                carts as c ON c.id = ci.cart_id
            JOIN 
                products as p ON p.id = ci.product_id
            WHERE 
                c.user_id = :user_id;
        ");

        $stmt->execute([
            "user_id" => $userID
        ]);

        return $stmt->fetchAll();
    }

    public function getUserGrandTotal(int $userID): float
    {
        $stmt = $this->db->prepare("
            SELECT
                COALESCE(SUM(p.unit_price * ci.quantity), 0) AS grand_total
            FROM cart_items AS ci
            JOIN carts AS c
                ON c.id = ci.cart_id
            JOIN products AS p
                ON p.id = ci.product_id
            WHERE c.user_id = :user_id;
        ");

        $stmt->execute([
            "user_id" => $userID
        ]);

        return (float) $stmt->fetchColumn();
    }

    public function clearUserItems(int $user_id) : array
    {
        $stmt = $this->db->prepare
        ("
            DELETE FROM cart_items
            WHERE cart_id IN (
                SELECT id
                FROM carts
                WHERE user_id = ?
            );
        ");
 
        $stmt->execute([
            $user_id
        ]);
 
        return [
            "affected_rows" => (int)$stmt->rowCount()
        ];
    }
}
?>