<?php 
$config = getConfig();

$service_path = $config["services_path"];

require_once $service_path."base.php";

class Auth extends BaseRepository 
{
    public function admin(array $body) : void
    {
        $token = $body["token"] ?? '';

        $token = $this->validateString($token);
        $token_hash = hash("sha256", $token);

        $author = $this->getByToken($token_hash);
        
        $this->authorIsAdmin($author);
    }

    public function owner(int $id_to_modify, array $body) : void
    {
        $token = $body["token"] ?? '';

        $token = $this->validateString($token);
        $token_hash = hash("sha256", $token);
        
        $author = $this->getByToken($token_hash);

        $this->authorIsOwner($id_to_modify, $author);
    }

    public function ownerAdmin(int $id_to_modify, array $body) : void
    {
        $token = $body["token"] ?? '';
        $token = $this->validateString($token);
        $token_hash = hash("sha256", $token);

        $author = $this->getByToken($token_hash);
        
        $this->authorIsOwnerAdmin($id_to_modify, $author);
    }

    public function authorIsAdmin(array $author)  : void 
    {

        if ((int)$author["role_id"] !== 1) {
            http_response_code(403);

            echo json_encode([
                "error" => "Forbidden"
            ]);

            exit(-1);
        }

    }

    public function authorIsOwner(int $id_to_modify, array $author)  : void 
    {
        if ((int)$author["user_id"] !== $id_to_modify) {
            http_response_code(403);

            echo json_encode([
                "error" => "Forbidden"
            ]);

            exit(-1);
        }
    }

    public function authorIsOwnerAdmin(int $id_to_modify, array $author)  : void 
    {
        if ((int)$author["role_id"] !== 1 && (int)$author["user_id"] !== $id_to_modify) {
            http_response_code(403);

            echo json_encode([
                "error" => "Forbidden"
            ]);

            exit(-1);
        }
    }

    public function getByToken(string $token_hash): array|false
    {
        $stmt = $this->db->prepare("
            SELECT
                u.id AS user_id,
                u.role_id,
                u.username
            FROM sessions AS s
            JOIN users AS u ON u.id = s.user_id
            WHERE s.token_hash = :token_hash
            AND s.expire_at > CURRENT_TIMESTAMP
        ");

        $stmt->execute([
            "token_hash" => $token_hash
        ]);

        return $stmt->fetch();
    }

    }



?>