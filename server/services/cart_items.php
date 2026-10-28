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

    public function addWithinStock(int $cartID, int $productID, int $quantity): array
    {
        $this->db->beginTransaction();

        try {
            $stmt = $this->db->prepare("
                SELECT stocks
                FROM products
                WHERE id = ?
                FOR UPDATE;
            ");
            $stmt->execute([$productID]);
            $stock = $stmt->fetchColumn();

            if ($stock === false) {
                $this->db->rollBack();
                return ["status" => "product_not_found"];
            }

            $stmt = $this->db->prepare("
                SELECT quantity
                FROM cart_items
                WHERE cart_id = ? AND product_id = ?;
            ");
            $stmt->execute([$cartID, $productID]);
            $existing_quantity = (int) ($stmt->fetchColumn() ?: 0);
            $available = (int) $stock - $existing_quantity;

            if ($quantity > $available) {
                $this->db->rollBack();
                return [
                    "status" => "insufficient_stock",
                    "available" => max(0, $available)
                ];
            }

            if ($existing_quantity > 0) {
                $this->updateQuantity(
                    $cartID,
                    $productID,
                    $existing_quantity + $quantity
                );
            } else {
                $this->insert(
                    ["cart_id", "product_id", "quantity"],
                    [$cartID, $productID, $quantity]
                );
            }

            $this->db->commit();
            return ["status" => "added"];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
    }

    public function setQuantityWithinStock(
        int $cartID,
        int $productID,
        int $quantity
    ): array {
        $this->db->beginTransaction();

        try {
            $stmt = $this->db->prepare("
                SELECT stocks
                FROM products
                WHERE id = ?
                FOR UPDATE;
            ");
            $stmt->execute([$productID]);
            $stock = $stmt->fetchColumn();

            if ($stock === false) {
                $this->db->rollBack();
                return ["status" => "product_not_found"];
            }

            if ($quantity > (int) $stock) {
                $this->db->rollBack();
                return [
                    "status" => "insufficient_stock",
                    "available" => (int) $stock
                ];
            }

            $stmt = $this->db->prepare("
                UPDATE cart_items
                SET quantity = ?
                WHERE cart_id = ? AND product_id = ?;
            ");
            $stmt->execute([$quantity, $cartID, $productID]);

            if ($stmt->rowCount() === 0) {
                $this->db->rollBack();
                return ["status" => "item_not_found"];
            }

            $this->db->commit();
            return ["status" => "updated"];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            throw $e;
        }
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
                p.image_path AS image_path,
                p.stocks AS product_stocks
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