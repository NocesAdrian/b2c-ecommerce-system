<?php

class BaseRepository 
{
    protected PDO $db;
    protected string $table;
    protected array $allowed_tables = [];
    protected array $allowed_fields = [];
    protected array $allowed_operators = ["=", "!=", ">", "<", ">=", "<="];

    public function __construct(string $db_path)
    {
        $this->db = require $db_path;
    }

    public function validateFields(array $fields) : void
    {
        foreach ($fields as $field) 
        {
            if(!in_array($field, $this->allowed_fields, true)) 
            {
                http_response_code(404);
                echo json_encode
                ([
                    "error" => "Field not found"
                ]);
                exit(-1);
            }
        }
    }

    public function validateOperator(string $operator) : void
    {
        if(!in_array($operator, $this->allowed_operators, true)) 
        {
            http_response_code(404);
            echo json_encode
            ([
                "error" => "operator not found"
            ]);
            exit(-1);
        }
    }

    public function validateString(string $string) : void
    {
        if (trim($string) === '')
        {
            http_response_code(400);

            echo json_encode
            ([
                "error" => "Invalid Request"
            ]);
            exit(-1);
        }
    }

    public function numberMatches(array $arr1, array $arr2) : void
    {
        if (count($arr1) !== count($arr2))
        {
            http_response_code(400);
            echo json_encode
            ([
                "error" => "not match"
            ]);
            exit(-1);
        }
    }

    public function insert(array $fields, array $values) : void 
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
            $params[$field] = $values[$index];
        };

        $stmt->execute($params);

        echo json_encode([
            "affected_rows" => (int)$stmt->rowCount()
        ]);

        exit(0);
    }

    public function update(array $fields, array $values, int $id_to_update) : void
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

        echo json_encode([
            "affected_rows" => (int)$stmt->rowCount()
        ]);

        exit(0);
    }

    public function delete(int $id_to_delete) : void 
    {
        
        $stmt = $this->db->prepare
        ("
            DELETE FROM ".$this->table."
            WHERE id = :id;
        ");
        $stmt->execute([
            "id" => $id_to_delete
        ]);

        echo json_encode([
            "affected_rows" => (int)$stmt->rowCount()
        ]);

        exit(0);
    }

    public function getAll() : array
    {
        $stmt = $this->db->prepare("SELECT * FROM ".$this->table.";");
        $stmt->execute();

        echo json_encode($stmt->fetchAll());
        exit(0);
    }

    public function get(int $id) : array
    {
        $stmt = $this->db->prepare("SELECT * FROM ".$this->table." WHERE id = :id;");
        $stmt->execute
        ([
            "id" => $id
        ]);

        echo json_encode($stmt->fetch());
        exit(0);
    }

    public function getCondition(array $fields, array $condition) : void
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

        echo json_encode($stmt->fetchAll());
        exit(0);
    }
}

?>