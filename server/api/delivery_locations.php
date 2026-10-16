<?php

// ============== IMPLEMENT AUTH LATER ================== //

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."delivery_locations.php";
$delivery_locations = new DeliveryLocationRepository($db_path);
require_once $service_path."auth.php";
$auth = new Auth($config["db_path"]);
require_once $service_path."sessions.php";
$sessions = new SessionRepository($config["db_path"]);

switch ($requested_route) {
    case "/api/delivery_locations":

        echo json_encode($delivery_locations->getAll());

        exit(0);

    case "/api/delivery_locations/create":

        $token_hash = hash("sha256", $sessions->validateToken($_COOKIE["token"] ?? ''));
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }

        $body = $delivery_locations->getJsonBody();

        $location = $delivery_locations->validateString($body["location"] ?? '');

        echo json_encode($delivery_locations->insert(["user_id", "location"], [$delivery_locations->validateID($author["user_id"], "users"), $location]));

        exit(0);

    case "/api/delivery_locations/delete":

        $body = $delivery_locations->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $delivery_locations->validateID($id, "categories");

        if (!$delivery_locations->exist($id)) {
            echo json_encode([
                "error" => "category dont exist"
            ]);
            exit(-1);
        }
        
        echo json_encode($delivery_locations->delete($id));

        exit(0);

    case "/api/delivery_locations/update":

        $body = $delivery_locations->getJsonBody();

        $id = $body["id"] ?? '';
        $name = $body["name"] ?? '';

        $id = $delivery_locations->validateID($id, "categories");
        $name = $delivery_locations->validateString($name);

        echo json_encode($delivery_locations->update(["name"], [$name], $id));

        exit(0);

    case "/api/delivery_locations/location":

        $body = $delivery_locations->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $delivery_locations->validateID($id, "categories");

        echo json_encode($delivery_locations->get($id));

        exit(0);

    default:
        break;
}

?>