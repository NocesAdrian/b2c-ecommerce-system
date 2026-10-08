<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class CartRepository extends BaseRepository
{
    protected string $table = "carts";

    protected array $allowed_fields = [
        "id",
        "user_id",
        "date_created"
    ];
}
?>