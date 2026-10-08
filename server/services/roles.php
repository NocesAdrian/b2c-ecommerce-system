<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class RoleRepository extends BaseRepository
{
    protected string $table = "roles";

    protected array $allowed_fields = [
        "id",
        "name",
        "description",
        "date_created"
    ];
}
?>