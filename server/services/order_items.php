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
}
?>