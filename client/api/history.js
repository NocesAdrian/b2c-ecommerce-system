import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    orders_user: `${config.api_src}/api/orders/user`,
    orders_cancel: `${config.api_src}/api/orders/cancel`,
    orders_pay: `${config.api_src}/api/orders/pay`
};

const payment_method_names = {
    gcash: "GCash"
};

const status_icons = {
    pending: "bi-clock",
    paid: "bi-check-circle",
    delivered: "bi-box-seam",
    cancelled: "bi-x-circle"
};

// Cancelled is muted, paid is the filled accent pill
function status_class(status) {
    if (status === "cancelled") return "pill-muted";
    if (status === "paid") return "pill-solid";
    return "";
}

let selected_order = null;

function format_peso(amount) {
    return `₱${Number(amount || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function capitalize(text) {
    const value = String(text || "");
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function format_date(date_text) {
    // MySQL DATETIME looks like "2026-10-25 21:14:03"
    const date = new Date(String(date_text).replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function method_name(method) {
    return payment_method_names[method] || capitalize(method);
}

// Fills a pill with an icon and a label
function set_pill(element, label, icon, extra_class = "") {
    element.className = `pill ${extra_class}`.trim();
    element.replaceChildren();

    const icon_element = document.createElement("i");
    icon_element.className = `bi ${icon}`;

    element.append(icon_element, document.createTextNode(label));
}

/* ---------------- API ---------------- */

async function get_orders() {
    const response = await fetch(api_endpoint.orders_user, {
        method: "GET",
        credentials: "include" // sends the "token" cookie
    });

    if (response.status === 401) {
        const error = new Error("Session expired or invalid");
        error.status = 401;
        throw error;
    }

    if (!response.ok) {
        throw new Error("Failed to fetch orders");
    }

    return await response.json();
}

async function post_order_action(endpoint, order_id) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ order_id })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(body.error || `Order action failed: ${response.status}`);
        error.status = response.status;
        error.details = body;
        throw error;
    }

    return body;
}

/* ---------------- List ---------------- */

function show_state(icon, title, text, with_retry = false) {
    const list = document.getElementById("order-list");
    const state = document.getElementById("history-state");

    list.innerHTML = "";
    state.classList.remove("d-none");

    state.innerHTML = `
        <i class="bi ${icon}"></i>
        <h3>${title}</h3>
        <p>${text}</p>
        ${with_retry
            ? '<button type="button" class="btn btn-soft" id="retry-btn">Try again</button>'
            : '<a href="customer.html" class="btn btn-d">Browse products</a>'}`;

    if (with_retry) {
        document.getElementById("retry-btn").addEventListener("click", load_orders);
    }
}

function show_loading() {
    const list = document.getElementById("order-list");

    document.getElementById("history-state").classList.add("d-none");
    document.getElementById("history-summary").textContent = "Loading your orders…";

    list.innerHTML = Array.from({ length: 4 }, () => `
        <div class="col-12 col-lg-6">
            <div class="order-card order-skeleton" aria-hidden="true"></div>
        </div>`).join("");
}

function render_orders(data) {
    const template = document.getElementById("order-card-template");
    const container = document.getElementById("order-list");
    const summary = document.getElementById("history-summary");

    if (!template || !container) {
        console.error("Order template or container not found.");
        return;
    }

    const orders = data.orders || [];

    if (orders.length === 0) {
        summary.textContent = "You haven't placed any orders yet.";
        show_state("bi-clock-history", "No orders yet", "Orders you place will show up here.");
        return;
    }

    document.getElementById("history-state").classList.add("d-none");
    container.innerHTML = "";

    summary.textContent = `${orders.length} ${orders.length === 1 ? "order" : "orders"} placed`;

    orders.forEach(order => {
        const clone = template.content.cloneNode(true);

        const card = clone.querySelector(".order-card");
        const item_count = Number(order.item_count);

        clone.querySelector(".order-id").textContent = `Order #${order.id}`;
        clone.querySelector(".order-date").textContent = format_date(order.date_created);

        set_pill(
            clone.querySelector(".order-status"),
            capitalize(order.status),
            status_icons[order.status] || "bi-clock",
            status_class(order.status)
        );

        clone.querySelector(".order-items").textContent =
            `${item_count} ${item_count === 1 ? "item" : "items"}`;
        clone.querySelector(".order-location").textContent =
            order.delivery_location || "No delivery location";
        clone.querySelector(".order-method").textContent = method_name(order.payment_method);

        clone.querySelector(".order-total").textContent = format_peso(order.total);

        // Click (or Enter / Space) opens the order popup
        card.addEventListener("click", () => open_order(order));
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                open_order(order);
            }
        });

        container.appendChild(clone);
    });
}

async function load_orders() {
    show_loading();

    try {
        const data = await get_orders();
        render_orders(data);
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error loading orders:", error);
        document.getElementById("history-summary").textContent = "";
        show_state("bi-wifi-off", "Couldn't load your orders", "Check your connection and try again.", true);
    }
}

// Reload the list quietly after pay / cancel (no loading skeleton)
async function refresh_orders() {
    try {
        render_orders(await get_orders());
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error refreshing orders:", error);
    }
}

/* ---------------- Popup ---------------- */

const order_modal_element = document.getElementById("orderModal");
const view_ids = ["view-details", "view-pay", "view-cancel", "view-done"];

function show_view(view_id) {
    view_ids.forEach(id => {
        document.getElementById(id).classList.toggle("d-none", id !== view_id);
    });
}

function open_order(order) {
    selected_order = order;

    const item_count = Number(order.item_count);
    const can_change = order.status === "pending";

    document.getElementById("orderModalTitle").textContent = `Order #${order.id}`;
    document.getElementById("modal-date").textContent = format_date(order.date_created);

    set_pill(
        document.getElementById("modal-status"),
        capitalize(order.status),
        status_icons[order.status] || "bi-clock",
        status_class(order.status)
    );

    document.getElementById("modal-items").textContent =
        `${item_count} ${item_count === 1 ? "item" : "items"}`;
    document.getElementById("modal-location").textContent =
        order.delivery_location || "No delivery location";
    document.getElementById("modal-method").textContent = method_name(order.payment_method);
    document.getElementById("modal-total").textContent = format_peso(order.total);

    // Pay / cancel are only offered while the order is pending
    const note = document.getElementById("modal-note");
    let note_text = "";

    if (order.status === "cancelled") {
        note_text = "This order was cancelled.";
    } else if (order.status === "delivered") {
        note_text = "This order has been delivered.";
    } else if (order.status === "paid") {
        note_text = "Payment received. We're preparing your order.";
    }

    document.getElementById("modal-actions").classList.toggle("d-none", !can_change);
    note.classList.toggle("d-none", can_change);
    note.textContent = note_text;

    // Order progress: Placed → Paid → Delivered (hidden for cancelled orders)
    const steps = document.getElementById("order-steps");
    const is_cancelled = order.status === "cancelled";
    const is_paid = order.status === "paid" || order.status === "delivered";
    const is_delivered = order.status === "delivered";

    steps.classList.toggle("d-none", is_cancelled);
    steps.querySelector('[data-step="placed"]').classList.add("is-done");
    steps.querySelector('[data-step="paid"]').classList.toggle("is-done", is_paid);
    steps.querySelector('[data-step="delivered"]').classList.toggle("is-done", is_delivered);

    show_view("view-details");
    bootstrap.Modal.getOrCreateInstance(order_modal_element).show();
}

function show_done(icon, title, text) {
    document.getElementById("done-icon").innerHTML = `<i class="bi ${icon}"></i>`;
    document.getElementById("done-title").textContent = title;
    document.getElementById("done-text").textContent = text;
    show_view("view-done");
}

async function run_order_action(endpoint, button, error_element, on_success) {
    const buttons = button.closest("div").querySelectorAll("button");
    const original_html = button.innerHTML;

    buttons.forEach(b => { b.disabled = true; });
    error_element.classList.add("d-none");
    button.textContent = "Please wait…";

    try {
        await post_order_action(endpoint, selected_order.id);
        on_success();
        await refresh_orders();
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error updating order:", error);
        button.innerHTML = original_html;
        buttons.forEach(b => { b.disabled = false; });

        if (error.status === 404 || error.status === 409) {
            error_element.textContent = endpoint === api_endpoint.orders_pay && error.details?.product_id
                ? "There isn't enough stock to pay for this order now. Cancel it and place a new order with available items."
                : error.message || "This order can't be changed anymore.";
            await refresh_orders();
        } else {
            error_element.textContent = "Something went wrong. Please try again.";
        }

        error_element.classList.remove("d-none");
    }
}

// Details → Pay
document.getElementById("pay-now-btn").addEventListener("click", () => {
    document.getElementById("pay-total").textContent = format_peso(selected_order.total);
    document.getElementById("pay-error").classList.add("d-none");
    show_view("view-pay");
});

// Details → Cancel
document.getElementById("cancel-order-btn").addEventListener("click", () => {
    document.getElementById("cancel-text").textContent =
        `Order #${selected_order.id} (${format_peso(selected_order.total)}) will be cancelled. This can't be undone.`;
    document.getElementById("cancel-error").classList.add("d-none");
    show_view("view-cancel");
});

// Back buttons
document.getElementById("pay-back-btn").addEventListener("click", () => show_view("view-details"));
document.getElementById("cancel-back-btn").addEventListener("click", () => show_view("view-details"));

// "I've paid"
document.getElementById("paid-confirm-btn").addEventListener("click", (event) => {
    run_order_action(
        api_endpoint.orders_pay,
        event.currentTarget,
        document.getElementById("pay-error"),
        () => show_done("bi-check2-circle", "Payment noted", `Order #${selected_order.id} is marked as paid. Thank you!`)
    );
});

// "Yes, cancel order"
document.getElementById("cancel-confirm-btn").addEventListener("click", (event) => {
    run_order_action(
        api_endpoint.orders_cancel,
        event.currentTarget,
        document.getElementById("cancel-error"),
        () => show_done("bi-x-circle", "Order cancelled", `Order #${selected_order.id} was cancelled.`)
    );
});

// Soft note if the GCash QR image can't be loaded
const gcash_image = document.querySelector("#gcash-qr img");

if (gcash_image) {
    gcash_image.addEventListener("error", () => {
        document.getElementById("gcash-qr").classList.add("is-missing");
    });
}

window.addEventListener("DOMContentLoaded", load_orders);
