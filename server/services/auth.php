<?php 
$config = getConfig();

$service_path = $config["services_path"];
require_once $service_path."base.php";

class AUTH extends BaseRepository 
{

    public function getByToken(
        string $token_hash
    ) : array | false
    {
        $stmt = $this->db->prepare("
            SELECT u.id, u.role_id, u.username
            FROM sessions AS s
            JOIN users AS u ON u.id = s.user_id
            WHERE s.token_hash = :token_hash;
        ");

        $stmt->execute([
            "token_hash" => $token_hash
        ]);

        return $stmt->fetch(); 
    }

    public function admin(array $body) : void
    {

        $token = $body["token"] ?? '';

        $this->validToken($token);
        $token_hash = hash("sha256", $token);

        $author = $this->getByToken($token_hash);
        
        $this->authorFound($author);
        $this->authorIsAdmin($author);

    }

    public function owner(int $id_to_modify, array $body) : void
    {
        
        $token = $body["token"] ?? '';

        $this->validToken($token);
        $token_hash = hash("sha256", $token);
        
        $author = $this->getByToken($token_hash);

        $this->authorFound($author);
        $this->authorIsOwner($id_to_modify, $author);

    }

    public function ownerAdmin(int $id_to_modify, array $body) : void
    {
    
        $token = $body["token"] ?? '';
        $this->validToken($token);
        $token_hash = hash("sha256", $token);

        $author = $this->getByToken($token_hash);
        
        $this->authorFound($author);
        $this->authorIsOwnerAdmin($id_to_modify, $author);

    }

    public function validToken(string $token) : void
    {
        if ($token === '') {
            http_response_code(400);

            echo json_encode([
                "error" => "Invalid Request"
            ]);

            exit(-1);
        }
    }

    public function authorFound(array|false $author) : void
    {
        if ($author === false) {
            http_response_code(401);

            echo json_encode([
                "error" => "Not authorized"
            ]);

            exit(-1);
        }   
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

        if ((int)$author["id"] !== $id_to_modify) {
            http_response_code(403);

            echo json_encode([
                "error" => "Forbidden"
            ]);

            exit(-1);
        }

    }

    public function authorIsOwnerAdmin(int $id_to_modify, array $author)  : void 
    {

        if ((int)$author["role_id"] !== 1 && (int)$author["id"] !== $id_to_modify) {
            http_response_code(403);

            echo json_encode([
                "error" => "Forbidden"
            ]);

            exit(-1);
        }

    }
}



?>