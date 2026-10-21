<?php

// ============== IMPLEMENT AUTH LATER ================== //

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."orders.php";
$orders = new OrderRepository($db_path);
require_once $service_path."order_items.php";
$orders_items = new OrderItemRepository($db_path);

switch ($requested_route) {
    case "/api/orders":

        echo json_encode($orders->getAll());

        exit(0);

    case "/api/orders/create":

        $body = $orders->getJsonBody();

        $token_hash = hash("sha256", $sessions->validateToken($_COOKIE["token"] ?? ''));
        $author = $sessions->getByToken($token_hash);
        
        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }

        $user_id = $orders->validateID($author["user_id"], "users");

        $order_result = $orders->add($user_id);

        if (!$order_result["id"])
        {
            http_response_code(500);
            echo json_encode(["error" => "Internal server error"]);
            exit(-1);
        }

        $orders->validateID($order_result["id"], "orders");
        $order_items_result = $orders_items->latch($order_result["id"]);
        $total_price = $orders_items->total_price($order_result["id"]);
        $orders->update(["total"], [$total_price["total_price"]], $order_result["id"]);

        http_response_code(201);

        echo json_encode([
            "message" => "Order created successfully",
            "order_id" => $order_result["id"],
            "total_price" => $total_price["total_price"]
        ]);

        exit(0);

    case "/api/categories/delete":

        $body = $orders->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $orders->validateID($id, "categories");

        if (!$orders->exist($id)) {
            echo json_encode([
                "error" => "category dont exist"
            ]);
            exit(-1);
        }
        
        echo json_encode($orders->delete($id));

        exit(0);

    case "/api/orders/update":

        $body = $orders->getJsonBody();

        $id = $body["id"] ?? '';
        $status = $body["status"] ?? '';
        $payment_status = $body["payment_status"] ?? '';

        $id = $orders->validateID($id, "orders");
        $status = $orders->validateString($status);
        $payment_status = $orders->validateString($payment_status);

        if (!in_array($status, ["pending", "paid", "delivered"], true)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid order status"]);
            exit(-1);
        }

        if (!in_array($payment_status, ["unpaid", "paid"], true)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid payment status"]);
            exit(-1);
        }

        echo json_encode(
            $orders->update(
                ["status", "payment_status"],
                [$status, $payment_status],
                $id
            )
        );

        exit(0);

    case "/api/categories/category":

        $body = $orders->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $orders->validateID($id, "categories");

        echo json_encode($orders->get($id));

        exit(0);

    default:
        break;
}

?>