<?php

// ============== IMPLEMENT AUTH LATER ================== //

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."carts.php";
$carts = new CartRepository($db_path);
require_once $service_path."auth.php";
$auth = new Auth($config["db_path"]);
require_once $service_path."sessions.php";
$sessions = new SessionRepository($config["db_path"]);
require_once $service_path."cart_items.php";
$cartItems = new CartItemRepository($config["db_path"]);

switch ($requested_route) {
    case "/api/carts":

        echo json_encode($carts->getAll());

        exit(0);

    case "/api/carts/create":
        
        $token = $_COOKIE["token"] ?? '';
        $token = $sessions->validateToken($token);

        $token_hash = hash("sha256", $token);
        
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }

        $user_id = $author["user_id"];
        $user_id = $carts->validateID($user_id, "users");

        $result = $carts->insert(["user_id"], [$user_id]);

        if ($result["affected_rows"] < 1) {
            http_response_code(500);
            exit(-1);
        };

        http_response_code(201);
        echo json_encode($result);

        exit(0);
/*
    case "/api/carts/delete":

        $body = $carts->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $carts->validateID($id, "carts");

        if (!$carts->exist($id)) {
            echo json_encode([
                "error" => "cart dont exist"
            ]);
            exit(-1);
        }
        
        echo json_encode($carts->delete($id));

        exit(0);
*/

/*
    case "/api/carts/update":

        $body = $carts->getJsonBody();

        $id = $body["id"] ?? '';
        $user_id = $body["user_id"] ?? '';

        $id = $carts->validateID($id, "carts");
        $user_id = $carts->validateID($user_id, "users");

        echo json_encode($carts->update(["user_id"], [$user_id], $id));

        exit(0);
*/

    case "/api/carts/cart":

        $token = $_COOKIE["token"] ?? '';
        $token = $sessions->validateToken($token);

        $token_hash = hash("sha256", $token);
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            $sessions->deleteByToken($token_hash);
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit(-1);
        }

        $user_id = $author["user_id"];
        $user_id = $carts->validateID($user_id, "users");

        echo json_encode($carts->getCondition(["id", "user_id"], ["user_id", $user_id, "="]));

        exit(0);

    case "/api/carts/items":
        $token = $_COOKIE["token"] ?? '';
        $token = $sessions->validateToken($token);

        $token_hash = hash("sha256", $token);
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit;
        }

        $user_id = $author["user_id"];
        $user_id = $carts->validateID($user_id, "users");

        $cart = $carts->getCondition(
            ["id"],
            ["user_id", $user_id, "="]
        );

        if (!$cart) {
            http_response_code(404);
            echo json_encode(["error" => "Cart not found"]);
            exit;
        }

        $cart_id = $cart[0]["id"];

        echo json_encode(
            $cartItems->getCondition(
                ["cart_id", "product_id", "quantity", "date_updated"],
                ["cart_id", $cart_id, "="]
            )
        );
        exit;

    case "/api/carts/items/user":
        $token = $_COOKIE["token"] ?? '';
        $token = $sessions->validateToken($token);

        $token_hash = hash("sha256", $token);
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit;
        }

        echo json_encode([
            "items" => $cartItems->getUserItems($author["user_id"]),
            "grand_total" => $cartItems->getUserGrandTotal($author["user_id"])
        ]);

        exit(0);


    case "/api/carts/items/create":
        $token = $_COOKIE["token"] ?? '';
        $token = $sessions->validateToken($token);

        $token_hash = hash("sha256", $token);
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit;
        }

        $user_id = $carts->validateID(
            $author["user_id"],
            "users"
        );

        $cart = $carts->getCondition(
            ["id"],
            ["user_id", $user_id, "="]
        );

        if (!$cart) {
            http_response_code(404);
            echo json_encode(["error" => "Cart not found"]);
            exit;
        }

        $body = $cartItems->getJsonBody();

        $product_id = $cartItems->validateID(
            $body["product_id"] ?? '',
            "products"
        );

        $quantity = $body["quantity"] ?? 0;

        if (!is_int($quantity) || $quantity <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Quantity must be a positive integer"]);
            exit;
        }

        $existing_item = $cartItems->getItem(
            (int) $cart[0]["id"],
            $product_id
        );

        if ($existing_item !== false) {

            http_response_code(200);
            $new_quantity = (int) $existing_item["quantity"] + $quantity;
            
            $cartItems->updateQuantity(
                (int) $cart[0]["id"],
                $product_id,
                $new_quantity
            );

            echo json_encode(["message" => "Cart updated successfully"]);   
            exit(0);
        } 
        
        $cartItems->insert(
            ["cart_id", "product_id", "quantity"],
            [$cart[0]["id"], $product_id, $quantity]
        );

        http_response_code(201);
        echo json_encode(["message" => "Cart updated successfully"]);
        exit;

    case "/api/carts/items/delete":
        $token = $_COOKIE["token"] ?? '';
        $token = $sessions->validateToken($token);

        $token_hash = hash("sha256", $token);
        $author = $sessions->getByToken($token_hash);

        if ($author === false) {
            http_response_code(401);
            echo json_encode(["error" => "Session expired or invalid"]);
            exit;
        }

        $user_id = $carts->validateID(
            $author["user_id"],
            "users"
        );

        $cart = $carts->getCondition(
            ["id"],
            ["user_id", $user_id, "="]
        );

        if (!$cart) {
            http_response_code(404);
            echo json_encode(["error" => "Cart not found"]);
            exit;
        }

        $body = $cartItems->getJsonBody();

        $product_id = $cartItems->validateID(
            $body["product_id"] ?? '',
            "products"
        );

        $cart_id = $cart[0]["id"];
        $result = $cartItems->deleteCartItems($cart_id, $product_id);

        if ($result["affected_rows"] < 1) {
            http_response_code(404);
            echo json_encode(["error" => "Cart item not found"]);
            exit;
        }
        echo json_encode(
            $result
        );

        exit;

    default:
        break;
}

?>