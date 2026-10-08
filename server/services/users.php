<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class UserRepository extends BaseRepository
{
    protected string $table = "users";

    protected array $allowed_fields = [
        "id",
        "role_id",
        "username",
        "password_hash",
        "date_updated",
        "date_created"
    ];
}
?>