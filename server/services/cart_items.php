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

    public function getItem(int $cartID, int $productID): array
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

        if ($record === false) {
            http_response_code(404);
            echo json_encode(["error" => "Record not found"]);
            exit;
        }

        return $record;
    }
}
?>