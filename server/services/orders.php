<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class OrderRepository extends BaseRepository
{
    protected string $table = "orders";

    protected array $allowed_fields = [
        "id",
        "user_id",
        "location_id",
        "status",
        "payment_method",
        "payment_status",
        "total",
        "date_created",
    ];
}
?>