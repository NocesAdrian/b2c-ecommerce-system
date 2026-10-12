<?php

// ============== IMPLEMENT AUTH LATER ================== //

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."carts.php";
$carts = new CartRepository($db_path);

switch ($requested_route) {
    case "/api/carts":

        echo json_encode($carts->getAll());

        exit(0);

    case "/api/carts/create":

        $body = $carts->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $carts->validateID($id, "users");

        echo json_encode($carts->insert(["user_id"], [$id]));

        exit(0);

    case "/api/carts/delete":

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

    case "/api/carts/update":

        $body = $categories->getJsonBody();

        $id = $body["id"] ?? '';
        $name = $body["name"] ?? '';

        $id = $categories->validateID($id, "categories");
        $name = $categories->validateString($name);

        echo json_encode($categories->update(["name"], [$name], $id));

        exit(0);

    case "/api/carts/category":

        $body = $categories->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $categories->validateID($id, "categories");

        echo json_encode($categories->get($id));

        exit(0);

    default:
        break;
}

?>