<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class SessionRepository extends BaseRepository
{
    protected string $table = "sessions";

    protected array $allowed_fields = [
        "id",
        "user_id",
        "token_hash",
        "remember_me",
        "expire_at",
        "date_created"
    ];
}
?>