<?php 
$config = getConfig();

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
}
?>