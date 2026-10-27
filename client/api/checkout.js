import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    cart_items: `${config.api_src}/api/carts/items/user`,
    orders_create: `${config.api_src}/api/orders/create`,
    orders_pay: `${config.api_src}/api/orders/pay`
};

function format_peso(amount) {
    return `₱${Number(amount || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

async function get_cart_items() {
    const response = await fetch(api_endpoint.cart_items, {
        method: "GET",
        credentials: "include" // sends the "token" cookie
    });

    if (response.status === 401) {
        const error = new Error("Session expired or invalid");
        error.status = 401;
        throw error;
    }

    if (!response.ok) {
        throw new Error("Failed to fetch cart items");
    }

    return await response.json();
}

function show_message(icon, text, with_retry = false) {
    const list = document.getElementById("checkoutItems");

    list.innerHTML = `
        <li class="items-empty">
            <i class="bi ${icon}"></i>
            ${text}
            ${with_retry ? '<div class="mt-3"><button type="button" class="btn btn-soft" id="retry-btn">Try again</button></div>' : ""}
            ${!with_retry && icon === "bi-bag" ? '<div class="mt-3"><a href="customer.html" class="btn btn-d">Browse products</a></div>' : ""}
        </li>`;

    if (with_retry) {
        document.getElementById("retry-btn").addEventListener("click", load_checkout);
    }
}

function set_summary(count, total) {
    document.getElementById("summaryCount").textContent = count;
    document.getElementById("summaryTotal").textContent = format_peso(total);
    document.getElementById("gcashTotal").textContent = format_peso(total);
}

function render_checkout(data) {
    const template = document.getElementById("checkout-item-template");
    const container = document.getElementById("checkoutItems");
    const pay_button = document.getElementById("payBtn");

    if (!template || !container) {
        console.error("Checkout template or container not found.");
        return;
    }

    const items = data.items || [];

    if (items.length === 0) {
        show_message("bi-bag", "Your cart is empty.");
        set_summary(0, 0);
        pay_button.disabled = true;
        return;
    }

    container.innerHTML = "";

    let total_quantity = 0;

    items.forEach(item => {
        const clone = template.content.cloneNode(true);

        const image = clone.querySelector("img");
        const name = clone.querySelector(".co-name");
        const quantity = clone.querySelector(".co-qty-value");
        const line_total = clone.querySelector(".co-total");

        // Image path is relative to the API origin
        if (item.image_path) {
            image.src = new URL(item.image_path, config.api_src).href;
            image.alt = item.product_name;
        } else {
            image.remove(); // no photo: the soft placeholder block stays
        }

        name.textContent = item.product_name;
        quantity.textContent = `× ${item.product_quantity}`;
        line_total.textContent = format_peso(Number(item.product_price) * Number(item.product_quantity));

        total_quantity += Number(item.product_quantity);
        container.appendChild(clone);
    });

    set_summary(total_quantity, data.grand_total);
    pay_button.disabled = false;
}

async function load_checkout() {
    const pay_button = document.getElementById("payBtn");

    pay_button.disabled = true;
    show_message("bi-hourglass-split", "Loading your items…");

    try {
        const data = await get_cart_items();
        render_checkout(data);
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error loading checkout:", error);
        show_message("bi-wifi-off", "Couldn't load your items.", true);
        set_summary(0, 0);
    }
}

// Show a soft placeholder note if the GCash QR image can't be loaded
const gcash_image = document.querySelector("#gcashQr img");

if (gcash_image) {
    gcash_image.addEventListener("error", () => {
        document.getElementById("gcashQr").classList.add("is-missing");
    });
}

// "Confirm checkout and pay" opens the GCash popup (data-bs-toggle on #payBtn).
// "Pay later" creates the order and leaves it unpaid.
// "Done" creates the order, then marks it as paid through /api/orders/pay.

async function create_order() {
    const response = await fetch(api_endpoint.orders_create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // sends the "token" cookie
        body: JSON.stringify({})
    });

    if (response.status === 401) {
        const error = new Error("Session expired or invalid");
        error.status = 401;
        throw error;
    }

    if (response.status === 409) {
        const error = new Error("Cart is empty");
        error.status = 409;
        throw error;
    }

    if (!response.ok) {
        // Include the status and the server's message to make debugging easier
        let detail = "";

        try {
            const body = await response.json();
            detail = body.error || JSON.stringify(body);
        } catch {
            detail = "(no JSON in the response)";
        }

        const error = new Error(`Failed to create order: ${response.status} ${detail}`);
        error.status = response.status;
        throw error;
    }

    return await response.json();
}

async function mark_order_paid(order_id) {
    const response = await fetch(api_endpoint.orders_pay, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ order_id })
    });

    if (!response.ok) {
        const error = new Error(`Failed to mark order as paid: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return await response.json();
}

function show_order_placed(pay_mode, data, is_paid) {
    document.getElementById("gcashIcon").innerHTML = '<i class="bi bi-check2-circle"></i>';
    const order_label = `Order #${data.order_id} (${format_peso(data.total_price)})`;

    if (pay_mode === "later") {
        document.getElementById("gcashTitle").textContent = "Order placed";
        document.getElementById("gcashText").textContent =
            `${order_label} is saved. You can pay later from History.`;
    } else if (is_paid) {
        document.getElementById("gcashTitle").textContent = "Order paid";
        document.getElementById("gcashText").textContent =
            `${order_label} is paid. Thank you!`;
    } else {
        // The order exists, but marking it as paid failed
        document.getElementById("gcashTitle").textContent = "Order placed";
        document.getElementById("gcashText").textContent =
            `${order_label} is placed, but we couldn't mark it as paid. You can pay from History.`;
    }

    document.getElementById("gcashQr").classList.add("d-none");
    document.getElementById("gcashAmountRow").classList.add("d-none");
    document.getElementById("gcashError").classList.add("d-none");
    document.getElementById("gcashActions").classList.add("d-none");

    // The server cleared the cart, so show it empty behind the popup too
    render_checkout({ items: [], grand_total: 0 });

    // Take the customer to their orders shortly after
    const redirect_delay = pay_mode === "paid" && !is_paid ? 4500 : 2500;

    setTimeout(() => {
        window.location.href = "history.html";
    }, redirect_delay);
}

async function place_order(pay_mode, clicked_button) {
    const done_button = document.getElementById("gcashDoneBtn");
    const later_button = document.getElementById("gcashLaterBtn");
    const error_text = document.getElementById("gcashError");
    const original_html = clicked_button.innerHTML;

    done_button.disabled = true;
    later_button.disabled = true;
    error_text.classList.add("d-none");
    clicked_button.textContent = "Placing order…";

    try {
        const data = await create_order();
        let is_paid = false;

        if (pay_mode === "paid") {
            try {
                await mark_order_paid(data.order_id);
                is_paid = true;
            } catch (pay_error) {
                // The order was already created, so don't let the customer retry from here
                console.error("Error marking order as paid:", pay_error);
            }
        }

        show_order_placed(pay_mode, data, is_paid);
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error creating order:", error);
        clicked_button.innerHTML = original_html;

        if (error.status === 409) {
            // Nothing to order (already placed, or the cart was emptied elsewhere)
            error_text.textContent = "Your cart is empty. Add items before checking out.";
            error_text.classList.remove("d-none");
            render_checkout({ items: [], grand_total: 0 });
            return; // keep both buttons disabled
        }

        error_text.textContent = "Couldn't place your order. Please try again.";
        done_button.disabled = false;
        later_button.disabled = false;
        error_text.classList.remove("d-none");
    }
}

document.getElementById("gcashDoneBtn").addEventListener("click", (event) => {
    place_order("paid", event.currentTarget);
});

document.getElementById("gcashLaterBtn").addEventListener("click", (event) => {
    place_order("later", event.currentTarget);
});

window.addEventListener("DOMContentLoaded", load_checkout);
