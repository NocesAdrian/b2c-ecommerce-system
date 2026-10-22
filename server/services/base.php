<?php
$config = getConfig();

$service_path = $config["services_path"];

require_once $service_path."sessions.php";

class BaseRepository 
{
    protected PDO $db;
    // protected SessionRepository $sessions;

    protected string $table;
    protected array $allowed_tables = [
        "users",
        "products",
        "orders",
        "carts",
        "order_items",
        "cart_items",
        "delivery_location",
        "roles",
        "sessions",
        "categories"
    ];
    protected array $allowed_fields = [];
    protected array $allowed_operators = ["=", "!=", ">", "<", ">=", "<="];

    protected string $image_path;

    public function __construct(string $db_path, ?string $storage_path = null)
    {
        $this->db = require $db_path;
        //$this->sessions = new SessionRepository($db_path);

        if ($storage_path !== null) $this->image_path = $storage_path.$this->table."/images/";
    }

    public function exist(int $id) : bool {
        $stmt = $this->db->prepare("
            SELECT count(*) AS count FROM ".$this->table."
            WHERE id = :id;
        ");

        $stmt->execute([
            "id" => $id
        ]);

        $record = $stmt->fetch();

        return (int)$record["count"] > 0;
    }

    public function validateFields(array $fields) : void
    {
        foreach ($fields as $field) 
        {
            if(!in_array($field, $this->allowed_fields, true)) 
            {
                http_response_code(400);
                echo json_encode
                ([
                    "error" => "Invalid request"
                ]);
                exit(-1);
            }
        }
    }

    public function validateTables(array $tables) : void
    {
        foreach ($tables as $table) 
        {
            if(!in_array($table, $this->allowed_tables, true)) 
            {
                http_response_code(400);
                echo json_encode
                ([
                    "error" => "Invalid request"
                ]);
                exit(-1);
            }
        }
    }

    public function validateOperator(string $operator) : void
    {
        if(!in_array($operator, $this->allowed_operators, true)) 
        {
            http_response_code(400);
            echo json_encode
            ([
                "error" => "Invalid request"
            ]);
            exit(-1);
        }
    }

    public function validateString(mixed $string) : string
    {
        if (!is_string($string) || trim($string) === '')
        {
            http_response_code(400);

            echo json_encode
            ([
                "error" => "Invalid request"
            ]);
            exit(-1);
        }
        
        return trim($string);
    }

    public function validateBool(mixed $value) : bool
    {
        if (!is_bool($value))
        {
            http_response_code(400);

            echo json_encode
            ([
                "error" => "Invalid request"
            ]);
            exit(-1);
        }
        
        return $value;
    }

    public function validateInt(mixed $value): int
    {
        $validated = filter_var($value, FILTER_VALIDATE_INT);

        if ($validated === false || $validated < 0) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid integer"]);
            exit;
        }

        return $validated;
    }

    public function validateJsonBody(mixed $array) : void
    {
        if (!is_object($array))
        {
            http_response_code(400);

            echo json_encode
            ([
                "error" => "Invalid request"
            ]);
            exit(-1);
        }
    }

    public function validateID(mixed $id_to_validate, string $table): int
    {
        if (filter_var($id_to_validate, FILTER_VALIDATE_INT) === false) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid request"]);
            exit(-1);
        }

        $id_to_validate = (int)$id_to_validate;

        if (!is_int($id_to_validate) || $id_to_validate < 1) {
            http_response_code(400);

            echo json_encode([
                "error" => "Invalid request"
            ]);

            exit(-1);
        }

        $this->validateTables([$table]);

        $stmt = $this->db->prepare("
            SELECT count(*) AS count FROM ".$table."
            WHERE id = :id;
        ");

        $stmt->execute([
            "id" => $id_to_validate
        ]);

        $record = $stmt->fetch();

        if ((int)$record["count"] === 0)
        {
            http_response_code(400);

            echo json_encode([
                "error" => "Invalid request"
            ]);

            exit(-1);
        }

        return $id_to_validate;
    }

    public function validateImage(mixed $image): bool
    {
        if ($image === null) return false;

        if (
            !is_array($image) ||
            !isset($image["error"], $image["tmp_name"], $image["size"]) ||
            $image["error"] !== UPLOAD_ERR_OK ||
            !is_uploaded_file($image["tmp_name"]) ||
            $image["size"] <= 0 ||
            $image["size"] > 5 * 1024 * 1024
        ) 
        {
            http_response_code(400);
            echo json_encode(["error" => "Invalid image upload"]);
            exit;
        }

        $imageInfo = getimagesize($image["tmp_name"]);

        if (
            $imageInfo === false ||
            !in_array($imageInfo[2], [
                IMAGETYPE_JPEG,
                IMAGETYPE_PNG,
                IMAGETYPE_WEBP,
            ], true)
        ) 
        {
            http_response_code(400);
            echo json_encode(["error" => "Invalid image type"]);
            exit;
        }

        return true;
    }

    public function numberMatches(array $arr1, array $arr2) : void
    {
        if (count($arr1) !== count($arr2))
        {
            http_response_code(400);
            echo json_encode
            ([
                "error" => "Invalid request"
            ]);
            exit(-1);
        }
    }

    public function insert(array $fields, array $values) : array 
    {
        $this->numberMatches($fields, $values);
        $this->validateFields($fields);

        $join_fields = implode(",", $fields);
        $param_fields = implode(
            ",",
            array_map
            (
                fn($field) => ":".$field,
                $fields
            )   
        );

        $stmt = $this->db->prepare
        ("
            INSERT INTO ".$this->table."( ".$join_fields." )
            VALUES ( ".$param_fields." );
        ");

        $params = [];

        foreach($fields as $index => $field)
        {
            $params[$field] = is_bool($values[$index])
                ? (int)$values[$index]
                : $values[$index];
        };

        $stmt->execute($params);
        
        return [
            "affected_rows" => (int)$stmt->rowCount()
        ];
    }

    public function update(array $fields, array $values, int $id_to_update) : array
    {
        $this->numberMatches($fields, $values);
        $this->validateFields($fields);

        $param_fields = implode(
            ",",
            array_map
            (
                fn($field) => $field." = :".$field,
                $fields
            )
        );

        $stmt = $this->db->prepare("
            UPDATE ".$this->table."
            SET ".$param_fields." 
            WHERE id = :id;
        ");

        $params = [];

        foreach($fields as $index => $field)
        {
            $params[$field] = $values[$index];
        };

        $params["id"] = $id_to_update;

        $stmt->execute($params);

        return [
            "affected_rows" => (int)$stmt->rowCount()
        ];
    }

    public function delete(int $id_to_delete) : array 
    {
        
        $stmt = $this->db->prepare
        ("
            DELETE FROM ".$this->table."
            WHERE id = :id;
        ");
        $stmt->execute([
            "id" => $id_to_delete
        ]);

        return [
            "affected_rows" => (int)$stmt->rowCount()
        ];
    }

    public function storeImage(mixed $image): string
    {
        $imageInfo = getimagesize($image["tmp_name"]);

        $extension = match ($imageInfo[2]) {
            IMAGETYPE_JPEG => "jpg",
            IMAGETYPE_PNG  => "png",
            IMAGETYPE_WEBP => "webp",
        };

        if (!is_dir($this->image_path)) {
            mkdir($this->image_path, 0755, true);
        }

        $filename = bin2hex(random_bytes(16)) . "." . $extension;
        $destination = $this->image_path . $filename;

        if (!move_uploaded_file($image["tmp_name"], $destination)) {
            http_response_code(500);
            echo json_encode(["error" => "Internal Server Error"]);
            exit;
        }

        return $this->getImagePath() . $filename;
    }

    public function deleteImage(string $image_path): void
    {
        if (is_file($image_path)) {
            unlink($image_path);
        }
    }

    public function getJsonBody() : array
    {
        $body = json_decode(file_get_contents("php://input"));
        $this->validateJsonBody($body);

        return (array)$body;
    }

    public function getAll() : array
    {
        $stmt = $this->db->prepare("SELECT * FROM ".$this->table.";");
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function get(int $id) : array
    {
        $stmt = $this->db->prepare("SELECT * FROM ".$this->table." WHERE id = :id;");
        $stmt->execute
        ([
            "id" => $id
        ]);

        $record = $stmt->fetch();

        if ($record === false) {
            http_response_code(404);
            echo json_encode(["error" => "Record not found"]);
            exit;
        }

        return $record;
    }

    public function getSelected(array $fields) : array
    {  
        $this->validateFields($fields);
        $join_fields = implode(",", $fields);

        $stmt = $this->db->prepare("
            SELECT ".$join_fields." 
            FROM ".$this->table.";
        ");
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getCondition(array $fields, array $condition) : array
    {  
        $this->validateFields($fields);
        $this->validateFields([$condition[0]]);
        $this->validateOperator($condition[2]);
        $join_fields = implode(",", $fields);

        $join_condition = $condition[0]." ".$condition[2]." :".$condition[0];

        $stmt = $this->db->prepare("
            SELECT ".$join_fields." 
            FROM ".$this->table." 
            WHERE ".$join_condition.";
        ");
        $stmt->execute([
            $condition[0] => $condition[1]
        ]);

        return $stmt->fetchAll();
    }

    public function getImagePath() : string 
    {
        return $this->image_path;    
    }
}

?>