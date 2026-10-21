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

    public function getAll() : array
    {
        $stmt = $this->db->prepare
        ("
            SELECT 
                p.id,
                p.name, 
                c.name AS category, 
                p.description, 
                p.unit_price, 
                p.stocks, 
                p.image_path
            FROM 
                products AS p
            JOIN 
                categories AS c 
            ON c.id = p.category_id;
        ");

        $stmt->execute();
        
        return $stmt->fetchAll();
    }

}
?>