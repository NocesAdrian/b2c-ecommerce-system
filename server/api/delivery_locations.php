<?php

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."delivery_locations.php";
$delivery_locations = new DeliveryLocationRepository($db_path);
require_once $service_path."sessions.php";
$sessions = new SessionRepository($db_path);
require_once $service_path."authorization.php";

switch ($requested_route) {
    case "/api/delivery_locations":

        requireAdminUser($sessions);
        echo json_encode($delivery_locations->getAll());

        exit(0);

    case "/api/delivery_locations/create":

        $author = requireAuthenticatedUser($sessions);

        $body = $delivery_locations->getJsonBody();

        $location = $delivery_locations->validateString($body["location"] ?? '');
        $result = $delivery_locations->saveForUser(
            (int) $author["user_id"],
            $location
        );
        
        http_response_code(200);
        echo json_encode($result);

        exit(0);

    case "/api/delivery_locations/delete":

        $author = requireAuthenticatedUser($sessions);
        echo json_encode($delivery_locations->deleteForUser((int) $author["user_id"]));

        exit(0);

    case "/api/delivery_locations/update":

        $author = requireAuthenticatedUser($sessions);
        $body = $delivery_locations->getJsonBody();
        $location = $delivery_locations->validateString($body["location"] ?? '');

        if (mb_strlen($location) > 255) {
            http_response_code(400);
            echo json_encode(["error" => "Delivery location must be 255 characters or fewer"]);
            exit(-1);
        }

        echo json_encode($delivery_locations->saveForUser((int) $author["user_id"], $location));

        exit(0);

    case "/api/delivery_locations/location":

        $author = requireAuthenticatedUser($sessions);
        $location = $delivery_locations->getForUser((int) $author["user_id"]);
        echo json_encode($location ?? []);

        exit(0);

    default:
        break;
}

?>