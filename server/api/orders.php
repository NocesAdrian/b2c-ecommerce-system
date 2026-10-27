<?php

// ============== IMPLEMENT AUTH LATER ================== //

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];
$storage_path = $config["storage_path"];

require_once $service_path."orders.php";
$orders = new OrderRepository($db_path);
require_once $service_path."order_items.php";
$orders_items = new OrderItemRepository($db_path);
require_once $service_path."products.php";
$products = new ProductRepository($db_path, $storage_path);

switch ($requested_route) {
    case "/api/orders":
 
        $token_hash = hash("sha256", $sessions->validateToken($_COOKIE["token"] ?? ''));
        $author = $sessions->getByToken($token_hash);
 
        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }
 
        // TODO: admin only (role_id = 1), return 403 otherwise.
 
        echo json_encode($orders->getAllDetailed());
 
        exit(0);

    case "/api/orders/user":

        $token_hash = hash("sha256", $sessions->validateToken($_COOKIE["token"] ?? ''));
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }

        $user_id = $orders->validateID($author["user_id"], "users");

        http_response_code(200);

        echo json_encode([
            "orders" => $orders->getByUser($user_id)
        ]);

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
 
        // ADDED: refuse to create an order from an empty cart
        // (also stops a second click or page refresh from creating a duplicate order)
        $cart_items = $cartItems->getUserItems($user_id);
 
        if (empty($cart_items)) {
            http_response_code(409);
            echo json_encode(["error" => "Cart is empty"]);
            exit(-1);
        }
 
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
 
        // ADDED: the order now holds a copy of the items, so empty the cart
        $cartItems->clearUserItems($user_id);
 
        http_response_code(201);
 
        echo json_encode([
            "message" => "Order created successfully",
            "order_id" => $order_result["id"],
            "total_price" => $total_price["total_price"]
        ]);
 
        exit(0);

    case "/api/orders/update":

        $body = $orders->getJsonBody();

        $token_hash = hash("sha256", $sessions->validateToken($_COOKIE["token"] ?? ''));
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }

        // TODO: only admins should reach this point (role_id = 1).
        // Add your admin check here, and return 403 if it fails.

        $id = $body["id"] ?? '';
        $status = $body["status"] ?? '';

        $id = $orders->validateID($id, "orders");
        $status = $orders->validateString($status);

        if (!in_array($status, ["pending", "paid", "delivered", "cancelled"], true)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid order status"]);
            exit(-1);
        }

        echo json_encode(
            $orders->update(
                ["status"],
                [$status],
                $id
            )
        );

        exit(0);

    case "/api/orders/cancel":
 
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
        $order_id = $orders->validateID($body["order_id"] ?? '', "orders");
 
        // Only the owner can change an order
        $order = $orders->getOwned($order_id, $user_id);
 
        if ($order === false) {
            http_response_code(404);
            echo json_encode(["error" => "Order not found"]);
            exit(-1);
        }
 
        // Only a pending order can be cancelled
        if ($order["status"] !== "pending") {
            http_response_code(409);
            echo json_encode(["error" => "Order can no longer be cancelled"]);
            exit(-1);
        }
 
        $orders->update(["status"], ["cancelled"], $order_id);
 
        http_response_code(200);
 
        echo json_encode([
            "message" => "Order cancelled",
            "order_id" => $order_id
        ]);
 
        exit(0);

    
    case "/api/orders/pay":
 
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
        $order_id = $orders->validateID($body["order_id"] ?? '', "orders");
 
        $order = $orders->getOwned($order_id, $user_id);
 
        if ($order === false) {
            http_response_code(404);
            echo json_encode(["error" => "Order not found"]);
            exit(-1);
        }
 
        // Only a pending order can be paid
        if ($order["status"] !== "pending") {
            http_response_code(409);
            echo json_encode(["error" => "Order can no longer be paid"]);
            exit(-1);
        }
 
        $orders->update(["status"], ["paid"], $order_id);
 
        http_response_code(200);
 
        echo json_encode([
            "message" => "Order marked as paid",
            "order_id" => $order_id
        ]);
 
        exit(0);

    case "/api/dashboard/stats":
 
        $token_hash = hash("sha256", $sessions->validateToken($_COOKIE["token"] ?? ''));
        $author = $sessions->getByToken($token_hash);
 
        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }
 
        // TODO: only admins (role_id = 1) should see these numbers.
        // Add your admin check here and return 403 if it fails.
 
        http_response_code(200);
 
        echo json_encode([
            "total_products" => $products->countAll()["total_products"],
            "total_orders" => $orders->countAll()["total_orders"],
            "total_revenue" => $orders->totalRevenue()["total_revenue"]
        ]);
 
        exit(0);

    case "/api/orders/items":
 
        $body = $orders->getJsonBody();
 
        $token_hash = hash("sha256", $sessions->validateToken($_COOKIE["token"] ?? ''));
        $author = $sessions->getByToken($token_hash);
 
        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }
 
        // TODO: admin only (role_id = 1), return 403 otherwise.
 
        $order_id = (int)($body["order_id"] ?? 0);
 
        if ($order_id <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "order_id is required"]);
            exit(-1);
        }
 
        echo json_encode($orders_items->getByOrder($order_id));
 
        exit(0);

    case "/api/orders/deliver":
 
        $body = $orders->getJsonBody();
 
        $token_hash = hash("sha256", $sessions->validateToken($_COOKIE["token"] ?? ''));
        $author = $sessions->getByToken($token_hash);
 
        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }
 
        // TODO: admin only (role_id = 1), return 403 otherwise.
 
        $order_id = $orders->validateID($body["order_id"] ?? '', "orders");
 
        if (!$orders->exist($order_id)) {
            http_response_code(404);
            echo json_encode(["error" => "Order not found"]);
            exit(-1);
        }
 
        $order = $orders->get($order_id);
 
        if ($order["status"] !== "paid") {
            http_response_code(409);
            echo json_encode(["error" => "Only paid orders can be delivered"]);
            exit(-1);
        }
 
        $orders->update(["status"], ["delivered"], $order_id);
 
        http_response_code(200);
        echo json_encode(["order_id" => $order_id, "status" => "delivered"]);
 
        exit(0);

    default:
        break;
}

?>