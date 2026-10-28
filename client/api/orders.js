import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    orders: `${config.api_src}/api/orders`,
    order_items: `${config.api_src}/api/orders/items`,
    order_deliver: `${config.api_src}/api/orders/deliver`
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

const filter_names = ["all", "pending", "paid", "delivered", "cancelled"];
const date_filter_names = ["all", "today", "week", "month", "last-7", "last-30", "custom"];

let all_orders = [];
let active_filter = "all";
let active_date_filter = "all";
let custom_date_range = { start: "", end: "" };
let search_text = "";
let selected_order = null;
let order_modal = null;

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

function order_time(order) {
    return new Date(String(order.date_created).replace(" ", "T")).getTime() || 0;
}

function date_key(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function order_date_key(order) {
    const date = String(order.date_created || "");
    return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : "";
}

function date_range() {
    const today = new Date();
    const today_key = date_key(today);

    switch (active_date_filter) {
        case "today":
            return { start: today_key, end: today_key };
        case "week": {
            const monday = new Date(today);
            monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
            return { start: date_key(monday), end: today_key };
        }
        case "month":
            return { start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`, end: today_key };
        case "last-7":
        case "last-30": {
            const start = new Date(today);
            start.setDate(today.getDate() - (active_date_filter === "last-7" ? 6 : 29));
            return { start: date_key(start), end: today_key };
        }
        case "custom":
            return custom_date_range;
        default:
            return { start: "", end: "" };
    }
}

function method_name(method) {
    return payment_method_names[method] || capitalize(method);
}

// Paid is the filled accent pill, cancelled is muted
function status_class(status) {
    if (status === "cancelled") return "pill-muted";
    if (status === "paid") return "pill-solid";
    return "";
}

function set_pill(element, label, icon, extra_class = "") {
    element.className = `pill ${extra_class}`.trim();
    element.replaceChildren();

    const icon_element = document.createElement("i");
    icon_element.className = `bi ${icon}`;

    element.append(icon_element, document.createTextNode(label));
}

/* ---------------- API ---------------- */

async function request(url, options = {}) {
    const response = await fetch(url, {
        credentials: "include", // sends the "token" cookie
        ...options
    });

    if (response.status === 401) {
        window.location.href = "login.html";
        const error = new Error("Session expired or invalid");
        error.status = 401;
        throw error;
    }

    if (!response.ok) {
        const error = new Error(`Request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }

    return await response.json();
}

async function get_orders() {
    const data = await request(api_endpoint.orders, { method: "GET" });

    // accepts [..] or { orders: [..] }
    return Array.isArray(data) ? data : (data.orders || []);
}

async function get_order_items(order_id) {
    const data = await request(api_endpoint.order_items, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id })
    });

    return Array.isArray(data) ? data : (data.items || []);
}

async function deliver_order(order_id) {
    return await request(api_endpoint.order_deliver, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id })
    });
}

/* ---------------- List ---------------- */

function matches(order) {
    if (active_filter !== "all" && order.status !== active_filter) {
        return false;
    }

    const { start, end } = date_range();
    const order_date = order_date_key(order);
    if ((start && (!order_date || order_date < start)) || (end && (!order_date || order_date > end))) {
        return false;
    }

    if (!search_text) {
        return true;
    }

    const haystack = [
        `#${order.id}`,
        order.id,
        order.username,
        order.delivery_location,
        order.status
    ].join(" ").toLowerCase();

    return haystack.includes(search_text);
}

function show_state(icon, title, text, show_retry = false) {
    document.getElementById("orders-state-icon").className = `bi ${icon}`;
    document.getElementById("orders-state-title").textContent = title;
    document.getElementById("orders-state-text").textContent = text;
    document.getElementById("orders-retry-btn").classList.toggle("d-none", !show_retry);
    document.getElementById("orders-state").classList.remove("d-none");
}

function update_counts() {
    document.querySelectorAll(".filter-chip").forEach(chip => {
        const name = chip.dataset.filter;
        const { start, end } = date_range();
        const count = all_orders.filter(order => {
            const order_date = order_date_key(order);
            const in_date_range = (!start || (order_date && order_date >= start))
                && (!end || (order_date && order_date <= end));
            return in_date_range && (name === "all" || order.status === name);
        }).length;

        chip.querySelector(".chip-count").textContent = count;
    });
}

function render_orders() {
    const container = document.getElementById("order-list");
    const template = document.getElementById("order-card-template");

    container.innerHTML = "";
    document.getElementById("orders-state").classList.add("d-none");

    update_counts();

    const shown = all_orders
        .filter(matches)
        .sort((a, b) => (order_time(b) - order_time(a)) || (Number(b.id) - Number(a.id)));

    const visible_orders = all_orders.filter(order => {
        const { start, end } = date_range();
        const order_date = order_date_key(order);
        return (!start || (order_date && order_date >= start))
            && (!end || (order_date && order_date <= end));
    }).length;
    const date_label = {
        all: "all time",
        today: "today",
        week: "this week",
        month: "this month",
        "last-7": "the last 7 days",
        "last-30": "the last 30 days",
        custom: "the selected dates"
    }[active_date_filter];
    document.getElementById("orders-summary").textContent =
        active_date_filter === "all"
            ? `${shown.length} of ${all_orders.length} ${all_orders.length === 1 ? "order" : "orders"}`
            : `${shown.length} of ${visible_orders} ${visible_orders === 1 ? "order" : "orders"} · ${date_label}`;

    if (shown.length === 0) {
        if (all_orders.length === 0) {
            show_state("bi-inbox", "No orders yet", "Orders placed by customers will show up here.");
        } else {
            show_state("bi-search", "No matching orders", "Try another date range, status, or search.");
        }
        return;
    }

    shown.forEach(order => {
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

        clone.querySelector(".order-customer").textContent = order.username || "Deleted user";
        clone.querySelector(".order-items").textContent = Number.isNaN(item_count)
            ? "Items"
            : `${item_count} ${item_count === 1 ? "item" : "items"}`;
        clone.querySelector(".order-location").textContent =
            order.delivery_location || "No delivery location";
        clone.querySelector(".order-total").textContent = format_peso(order.total);

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
    document.getElementById("orders-summary").textContent = "Loading orders…";

    try {
        all_orders = await get_orders();
        render_orders();
    } catch (error) {
        console.error("Error loading orders:", error);

        document.getElementById("order-list").innerHTML = "";
        document.getElementById("orders-summary").textContent = "";
        show_state(
            "bi-wifi-off",
            error.status === 403 ? "Admins only" : "Couldn't load orders",
            error.status === 403 ? "Only admins can see orders." : "Please check your connection and try again.",
            error.status !== 403
        );
    }
}

/* ---------------- Popup ---------------- */

function show_modal_error(message) {
    const box = document.getElementById("modal-error");

    box.querySelector("span").textContent = message;
    box.classList.toggle("d-none", !message);
}

function render_items(items) {
    const list = document.getElementById("modal-items-list");
    const note = document.getElementById("modal-items-note");

    list.innerHTML = "";
    note.classList.add("d-none");

    if (items === null) {
        note.textContent = "Couldn't load the items.";
        note.classList.remove("d-none");
        return;
    }

    if (items.length === 0) {
        note.textContent = "No items found for this order.";
        note.classList.remove("d-none");
        return;
    }

    items.forEach(item => {
        const quantity = Number(item.quantity || 1);
        const unit_price = Number(item.unit_price ?? item.price ?? 0);

        const row = document.createElement("li");

        const name = document.createElement("span");
        name.className = "item-name";
        name.textContent = item.name || item.product_name || "Item";

        const qty = document.createElement("span");
        qty.className = "item-qty";
        qty.textContent = `× ${quantity}`;
        name.appendChild(qty);

        const price = document.createElement("span");
        price.className = "item-price";
        price.textContent = format_peso(unit_price * quantity);

        row.append(name, price);
        list.appendChild(row);
    });
}

function fill_modal(order) {
    document.getElementById("orderModalTitle").textContent = `Order #${order.id}`;
    document.getElementById("modal-date").textContent = format_date(order.date_created);

    set_pill(
        document.getElementById("modal-status"),
        capitalize(order.status),
        status_icons[order.status] || "bi-clock",
        status_class(order.status)
    );

    document.getElementById("modal-customer").textContent = order.username || "Deleted user";
    document.getElementById("modal-location").textContent = order.delivery_location || "No delivery location";
    document.getElementById("modal-method").textContent = method_name(order.payment_method);
    document.getElementById("modal-total").textContent = format_peso(order.total);

    // Progress
    const steps = document.getElementById("order-steps");
    const is_cancelled = order.status === "cancelled";
    const is_paid = order.status === "paid" || order.status === "delivered";

    steps.classList.toggle("d-none", is_cancelled);
    steps.querySelector('[data-step="placed"]').classList.add("is-done");
    steps.querySelector('[data-step="paid"]').classList.toggle("is-done", is_paid);
    steps.querySelector('[data-step="delivered"]').classList.toggle("is-done", order.status === "delivered");

    // Only a paid order can be marked as delivered
    const notes = {
        pending: "Waiting for the customer to pay. It can be delivered once it's paid.",
        delivered: "This order has been delivered.",
        cancelled: "This order was cancelled."
    };
    const can_deliver = order.status === "paid";
    const note = document.getElementById("modal-note");

    document.getElementById("modal-actions").classList.toggle("d-none", !can_deliver);
    note.textContent = notes[order.status] || "";
    note.classList.toggle("d-none", can_deliver || !notes[order.status]);

    const button = document.getElementById("deliver-btn");
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-box-seam me-2"></i>Mark as delivered';

    show_modal_error("");
}

async function open_order(order) {
    selected_order = order;

    fill_modal(order);
    render_items([]);
    document.getElementById("modal-items-note").textContent = "Loading items…";
    document.getElementById("modal-items-note").classList.remove("d-none");

    order_modal.show();

    try {
        const items = await get_order_items(order.id);

        // ignore a late answer if another order was opened meanwhile
        if (selected_order === order) {
            render_items(items);
        }
    } catch (error) {
        console.error("Error loading order items:", error);

        if (selected_order === order) {
            render_items(null);
        }
    }
}

async function handle_deliver() {
    if (!selected_order || selected_order.status !== "paid") {
        return;
    }

    const button = document.getElementById("deliver-btn");

    button.disabled = true;
    button.textContent = "Saving…";
    show_modal_error("");

    try {
        await deliver_order(selected_order.id);

        selected_order.status = "delivered";

        fill_modal(selected_order);
        render_orders();
    } catch (error) {
        console.error("Error marking order as delivered:", error);

        button.disabled = false;
        button.innerHTML = '<i class="bi bi-box-seam me-2"></i>Mark as delivered';

        show_modal_error(error.status === 409
            ? "Only paid orders can be delivered. Refresh and try again."
            : "Couldn't update the order. Please try again.");
    }
}

/* ---------------- Events ---------------- */

window.addEventListener("DOMContentLoaded", () => {
    order_modal = new bootstrap.Modal(document.getElementById("orderModal"));

    document.getElementById("deliver-btn").addEventListener("click", handle_deliver);
    document.getElementById("orders-retry-btn").addEventListener("click", load_orders);

    document.getElementById("order-filters").addEventListener("click", (event) => {
        const chip = event.target.closest(".filter-chip");

        if (!chip || !filter_names.includes(chip.dataset.filter)) {
            return;
        }

        active_filter = chip.dataset.filter;

        document.querySelectorAll(".filter-chip").forEach(other => {
            const is_active = other === chip;

            other.classList.toggle("is-active", is_active);
            other.setAttribute("aria-selected", String(is_active));
        });

        render_orders();
    });

    document.getElementById("date-filter-presets").addEventListener("click", event => {
        const button = event.target.closest(".date-filter-chip");

        if (!button || !date_filter_names.includes(button.dataset.dateFilter)) {
            return;
        }

        active_date_filter = button.dataset.dateFilter;
        custom_date_range = { start: "", end: "" };
        document.getElementById("order-date-start").value = "";
        document.getElementById("order-date-end").value = "";
        document.getElementById("date-filter-error").classList.add("d-none");

        document.querySelectorAll(".date-filter-chip").forEach(chip => {
            const is_active = chip === button;
            chip.classList.toggle("is-active", is_active);
            chip.setAttribute("aria-pressed", String(is_active));
        });

        render_orders();
    });

    document.getElementById("custom-date-filter").addEventListener("submit", event => {
        event.preventDefault();
        const start = document.getElementById("order-date-start").value;
        const end = document.getElementById("order-date-end").value;
        const error = document.getElementById("date-filter-error");

        if (start && end && start > end) {
            error.textContent = "The start date must be on or before the end date.";
            error.classList.remove("d-none");
            return;
        }

        custom_date_range = { start, end };
        active_date_filter = start || end ? "custom" : "all";
        error.classList.add("d-none");
        document.querySelectorAll(".date-filter-chip").forEach(chip => {
            const is_active = chip.dataset.dateFilter === active_date_filter;
            chip.classList.toggle("is-active", is_active);
            chip.setAttribute("aria-pressed", String(is_active));
        });
        render_orders();
    });

    // Navbar search filters the list (by order number, customer, location, status)
    document.getElementById("order-search").addEventListener("input", (event) => {
        search_text = event.target.value.trim().toLowerCase();
        render_orders();
    });

    load_orders();
});
