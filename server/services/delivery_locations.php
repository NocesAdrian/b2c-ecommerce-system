<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class DeliveryLocationRepository extends BaseRepository
{
    protected string $table = "delivery_locations";

    protected array $allowed_fields = [
        "id",
        "user_id",
        "location",
        "date_created"
    ];
}
?>