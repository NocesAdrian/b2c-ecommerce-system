<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class CategoryRepository extends BaseRepository
{
    protected string $table = "categories";

    protected array $allowed_fields = [
        "id",
        "name",
        "date_created"
    ];
}
?>