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
}
?>