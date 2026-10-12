<?php

// ============== IMPLEMENT AUTH LATER ================== //

$config = getConfig();

$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];
$storage_path = $config["storage_path"];

require_once $service_path."products.php";
$products = new ProductRepository($db_path, $storage_path);

switch ($requested_route) {
    case "/api/products":

        echo json_encode($products->getAll());

        exit(0);

    case "/api/products/create":

        $category_id = $_POST["category_id"] ?? '';
        $name = $_POST["name"] ?? '';
        $description = $_POST["description"] ?? '';
        $unit_price = $_POST["unit_price"] ?? '';
        $stocks = $_POST["stocks"] ?? '';
        $image = $_FILES["image"] ?? null;

        $category_id = $products->validateID($category_id, "categories");
        $name = $products->validateString($name);
        $description = $products->validateString($description);
        $unit_price = $products->validatePrice($unit_price); 
        $stocks = $products->validateInt($stocks);
        $image_path = (!$products->validateImage($image)) 
            ? $config["default_product_image"]  
            : $products->storeImage($image);

        $image_path = strstr($image_path, "/storage");

        $fields = [
            "category_id",
            "name",
            "description",
            "unit_price",
            "stocks",
            "image_path"
        ];

        $values = [
            $category_id,
            $name,
            $description,
            $unit_price,
            $stocks,
            $image_path
        ];

        echo json_encode($products->insert($fields, $values));

        exit(0);

    // TODO make it soft delete never delete it on  instead just hide it when stock is 0
    case "/api/products/delete":

        $body = $products->getJsonBody();

        $id = $body["id"] ?? '';
        $id = $products->validateID($id, "products");

        if (!$products->exist($id)) {
            echo json_encode([
                "error" => "product dont exist"
            ]);
            exit(-1);
        }
        $product = $products->get($id);
        $result = $products->delete($id);

        if ($product["image_path"] !== "/storage/default/images/default.jpg") {
            $to_delete_image = $product["image_path"];
            $products->deleteImage($to_delete_image);
        }
        
        echo json_encode($result);
        exit(0);

    case "/api/products/update":

        $id = $_POST["id"] ?? '';
        $category_id = $_POST["category_id"] ?? '';
        $name = $_POST["name"] ?? '';
        $description = $_POST["description"] ?? '';
        $unit_price = $_POST["unit_price"] ?? '';
        $stocks = $_POST["stocks"] ?? '';
        $image = $_FILES["image"] ?? null;

        $id = $products->validateID($id, "products");
        $category_id = $products->validateID($category_id, "categories");
        $name = $products->validateString($name);
        $description = $products->validateString($description);
        $unit_price = $products->validatePrice($unit_price);
        $stocks = $products->validateInt($stocks);

        $product = $products->get($id);

        $has_new_image = $products->validateImage($image);

        $image_path = $has_new_image
            ? $products->storeImage($image)
            : $product["image_path"];

        $image_path = strstr($image_path, "/storage");

        $fields = [
            "category_id",
            "name",
            "description",
            "unit_price",
            "stocks",
            "image_path"
        ];

        $values = [
            $category_id,
            $name,
            $description,
            $unit_price,
            $stocks,
            $image_path
        ];

        $result = $products->update($fields, $values, $id);

        if ($has_new_image && $result) {
            $products->deleteImage($product["image_path"]);
        }

        echo json_encode($result);

        exit(0);

    case "/api/products/product":

        $body = $products->getJsonBody();

        $id = $body["id"] ?? '';

        $id = $products->validateID($id, "products");

        echo json_encode($products->get($id));

        exit(0);

    default:
        break;
}

?>