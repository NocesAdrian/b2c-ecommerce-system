<?php

// ============== IMPLEMENT AUTH LATER ================== //

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."categories.php";
$categories = new CategoryRepository($db_path);

switch ($requested_route) {
    case "/api/categories":

        echo json_encode($categories->getAll());

        exit(0);

    case "/api/categories/create":

        $body = $categories->getJsonBody();

        $name = $body["name"] ?? '';
        $name = $categories->validateString($name);

        echo json_encode($categories->insert(["name"], [$name]));

        exit(0);

    case "/api/categories/delete":

        $body = $categories->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $categories->validateID($id, "categories");

        if (!$categories->exist($id)) {
            echo json_encode([
                "error" => "category dont exist"
            ]);
            exit(-1);
        }
        
        echo json_encode($categories->delete($id));

        exit(0);

    case "/api/categories/update":

        $body = $categories->getJsonBody();

        $id = $body["id"] ?? '';
        $name = $body["name"] ?? '';

        $id = $categories->validateID($id, "categories");
        $name = $categories->validateString($name);

        echo json_encode($categories->update(["name"], [$name], $id));

        exit(0);

    case "/api/categories/category":

        $body = $categories->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $categories->validateID($id, "categories");

        echo json_encode($categories->get($id));

        exit(0);

    default:
        break;
}

?>