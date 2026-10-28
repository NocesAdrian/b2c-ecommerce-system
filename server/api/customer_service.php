<?php

$config = getConfig();
$db_path = $config["db_path"];
$requested_route = $config["requested_route"];
$service_path = $config["services_path"];

require_once $service_path."sessions.php";
require_once $service_path."authorization.php";
require_once $service_path."customer_service.php";

$sessions = new SessionRepository($db_path);
$author = requireAuthenticatedUser($sessions);
$customer_service = new CustomerServiceRepository($db_path);

switch ($requested_route) {
    case "/api/customer-service/updates":
        if ($_SERVER["REQUEST_METHOD"] !== "GET") {
            http_response_code(405);
            header("Allow: GET");
            echo json_encode(["error" => "Method not allowed"]);
            exit;
        }

        echo json_encode($customer_service->getUpdates($author));
        exit;

    case "/api/customer-service/conversation":
        $conversation_id = $customer_service->getOrCreateConversation((int) $author["user_id"]);

        if ($_SERVER["REQUEST_METHOD"] === "GET") {
            echo json_encode([
                "conversation_id" => $conversation_id,
                "messages" => $customer_service->getMessages($conversation_id)
            ]);
            exit;
        }

        if ($_SERVER["REQUEST_METHOD"] !== "POST") {
            http_response_code(405);
            header("Allow: GET, POST");
            echo json_encode(["error" => "Method not allowed"]);
            exit;
        }

        $body = json_decode(file_get_contents("php://input"), true);
        $message = is_array($body) ? ($body["message"] ?? null) : null;

        if (!is_string($message) || trim($message) === "") {
            http_response_code(400);
            echo json_encode(["error" => "Enter a message to continue."]);
            exit;
        }

        $message = trim($message);
        if (preg_match('/^.{0,2000}$/us', $message) !== 1) {
            http_response_code(400);
            echo json_encode(["error" => "Messages must be 2,000 characters or fewer."]);
            exit;
        }

        if ($customer_service->countRecentUserMessages($conversation_id) >= 10) {
            http_response_code(429);
            echo json_encode(["error" => "You have sent several messages recently. Please wait a minute and try again."]);
            exit;
        }

        $assistant = new GeminiCustomerAssistant();
        if (!$assistant->isConfigured()) {
            error_log("Gemini customer service is unavailable because GEMINI_API_KEY is not configured.");
            http_response_code(503);
            echo json_encode(["error" => "AI customer service is not configured yet. Please contact the store administrator."]);
            exit;
        }

        $history = $customer_service->getRecentMessages($conversation_id);
        $history[] = ["sender" => "user", "message" => $message];

        try {
            $reply = $assistant->reply($history, $customer_service->getAssistantContext($author));
        } catch (RuntimeException $error) {
            error_log("Customer service assistant error: ".$error->getMessage());
            http_response_code(503);
            echo json_encode(["error" => $error->getMessage()]);
            exit;
        }

        $customer_service->saveExchange($conversation_id, $message, $reply);

        echo json_encode([
            "message" => [
                "sender" => "assistant",
                "message" => $reply,
                "date_created" => date("Y-m-d H:i:s")
            ]
        ]);
        exit;

    default:
        break;
}
?>
