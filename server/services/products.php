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
            (float) $price <= 0
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

    public function getInventoryOverview(int $low_stock_limit = 5): array
    {
        $stmt = $this->db->query("
            SELECT
                COUNT(*) AS total_products,
                COALESCE(SUM(CASE WHEN stocks = 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_products,
                COALESCE(SUM(CASE WHEN stocks > 0 AND stocks <= ".$low_stock_limit." THEN 1 ELSE 0 END), 0) AS low_stock_products
            FROM products;
        ");
        $overview = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->query("
            SELECT id, name, stocks
            FROM products
            WHERE stocks <= ".$low_stock_limit."
            ORDER BY stocks ASC, name ASC
            LIMIT 8;
        ");
        $overview["stock_alerts"] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach (["total_products", "low_stock_products", "out_of_stock_products"] as $key) {
            $overview[$key] = (int) $overview[$key];
        }

        foreach ($overview["stock_alerts"] as &$product) {
            $product["id"] = (int) $product["id"];
            $product["stocks"] = (int) $product["stocks"];
        }
        unset($product);

        return $overview;
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