<?php 
$config = getConfig();

$storage_path = $config["storage_path"];

$service_path = $config["services_path"];
require_once $service_path."base.php";

class ProductRepository extends BaseRepository
{
    protected string $table = "products";

    protected array $allowed_fields = [
        "id",
        "category_id",
        "name",
        "description",
        "unit_price",
        "stocks",
        "image_path",
        "date_updated",
        "date_created"
    ];

    public function validatePrice(mixed $price): float
    {
        if (
            !is_string($price) &&
            !is_int($price) &&
            !is_float($price)
        ) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid price"]);
            exit;
        }

        if (
            !is_numeric($price) ||
            !is_finite((float) $price) ||
            (float) $price < 0
        ) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid price"]);
            exit;
        }

        return (float) $price;
    }

    public function getById(int $id): array|false
    {
        $stmt = $this->db->prepare("
            SELECT
                p.id,
                p.name,
                c.name AS category,
                p.description,
                p.unit_price,
                p.stocks,
                p.image_path
            FROM products AS p
            JOIN categories AS c
                ON c.id = p.category_id
            WHERE p.id = ?;
        ");

        $stmt->execute([$id]);

        return $stmt->fetch();
    }

    public function countAll() : array
    {
        $stmt = $this->db->prepare
        ("
            SELECT COUNT(*) AS total_products
            FROM products;
        ");
 
        $stmt->execute();
 
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
 
        return [
            "total_products" => (int)$row["total_products"]
        ];
    }

    public function getCategories() : array
    {
        $stmt = $this->db->prepare
        ("
            SELECT id, name
            FROM categories
            ORDER BY name;
        ");
 
        $stmt->execute();
 
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>