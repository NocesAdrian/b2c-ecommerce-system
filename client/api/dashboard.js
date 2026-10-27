import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    dashboard_stats: `${config.api_src}/api/dashboard/stats`,
    orders: `${config.api_src}/api/orders`
};

function format_peso(amount) {
    return `₱${Number(amount || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function format_count(amount) {
    return Number(amount || 0).toLocaleString("en-PH");
}

async function get_stats() {
    const response = await fetch(api_endpoint.dashboard_stats, {
        method: "GET",
        credentials: "include" // sends the "token" cookie
    });

    if (response.status === 401) {
        const error = new Error("Session expired or invalid");
        error.status = 401;
        throw error;
    }

    if (!response.ok) {
        const error = new Error("Failed to fetch dashboard stats");
        error.status = response.status;
        throw error;
    }

    return await response.json();
}

function set_loading(is_loading) {
    document.querySelectorAll(".stat-card").forEach(card => {
        card.classList.toggle("is-loading", is_loading);
    });

    document.getElementById("dash-error").classList.add("d-none");
    document.getElementById("refresh-btn").disabled = is_loading;
}

// Counts up from 0 to the real number (skipped when the user prefers less motion)
function show_number(element, target, formatter) {
    const reduce_motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce_motion) {
        element.textContent = formatter(target);
        return;
    }

    const duration = 900;
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        element.textContent = formatter(target * eased);

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = formatter(target);
        }
    }

    requestAnimationFrame(step);
}

function render_stats(data) {
    show_number(document.getElementById("stat-products"), Number(data.total_products), value => format_count(Math.round(value)));
    show_number(document.getElementById("stat-orders"), Number(data.total_orders), value => format_count(Math.round(value)));
    show_number(document.getElementById("stat-revenue"), Number(data.total_revenue), format_peso);
}

function show_error(text) {
    const error_box = document.getElementById("dash-error");

    error_box.querySelector("span").textContent = text;
    error_box.classList.remove("d-none");

    ["stat-products", "stat-orders"].forEach(id => {
        document.getElementById(id).textContent = "–";
    });
    document.getElementById("stat-revenue").textContent = "–";
}

async function load_stats() {
    set_loading(true);

    try {
        const data = await get_stats();

        set_loading(false);
        render_stats(data);
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error loading dashboard stats:", error);

        set_loading(false);
        show_error(error.status === 403
            ? "Only admins can see these numbers."
            : "Couldn't load the numbers. Please try again.");
    }
}

/* ---------- Recent orders (latest 5) ---------- */

const recent_limit = 5;

async function get_orders() {
    const response = await fetch(api_endpoint.orders, {
        method: "GET",
        credentials: "include"
    });

    if (response.status === 401) {
        const error = new Error("Session expired or invalid");
        error.status = 401;
        throw error;
    }

    if (!response.ok) {
        const error = new Error("Failed to fetch orders");
        error.status = response.status;
        throw error;
    }

    const data = await response.json();

    // accepts [..] or { orders: [..] }
    return Array.isArray(data) ? data : (data.orders || []);
}

function format_date(value) {
    const date = new Date(String(value).replace(" ", "T"));

    if (isNaN(date)) {
        return value || "";
    }

    return date.toLocaleString("en-PH", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit"
    });
}

function render_group(status, orders) {
    const list = document.getElementById(`recent-${status}`);
    const template = document.getElementById("recent-order-template");

    list.innerHTML = "";

    // this status only, newest first, latest 5
    const latest = orders
        .filter(order => String(order.status || "").toLowerCase() === status)
        .sort((a, b) => {
            const time_a = new Date(String(a.date_created).replace(" ", "T")).getTime() || 0;
            const time_b = new Date(String(b.date_created).replace(" ", "T")).getTime() || 0;

            return (time_b - time_a) || (Number(b.id) - Number(a.id));
        })
        .slice(0, recent_limit);

    document.getElementById(`empty-${status}`).classList.toggle("d-none", latest.length > 0);

    latest.forEach(order => {
        const node = template.content.cloneNode(true);

        node.querySelector(".recent-id").textContent = `Order #${order.id}`;
        node.querySelector(".recent-date").textContent = format_date(order.date_created);
        node.querySelector(".recent-total").textContent = format_peso(order.total);

        list.appendChild(node);
    });
}

function order_time(order) {
    return new Date(String(order.date_created).replace(" ", "T")).getTime() || 0;
}

function render_order_group(orders, status) {
    const list = document.getElementById(`recent-${status}`);
    const empty = document.getElementById(`empty-${status}`);
    const template = document.getElementById("recent-order-template");

    list.innerHTML = "";

    // only this status, newest first, latest 5
    const latest = orders
        .filter(order => String(order.status || "").toLowerCase() === status)
        .sort((a, b) => (order_time(b) - order_time(a)) || (Number(b.id) - Number(a.id)))
        .slice(0, recent_limit);

    empty.classList.toggle("d-none", latest.length > 0);

    latest.forEach(order => {
        const node = template.content.cloneNode(true);

        node.querySelector(".recent-id").textContent = `Order #${order.id}`;
        node.querySelector(".recent-date").textContent = format_date(order.date_created);
        node.querySelector(".recent-total").textContent = format_peso(order.total);

        list.appendChild(node);
    });
}

function render_recent_orders(orders) {
    document.getElementById("recent-error").classList.add("d-none");

    ["pending", "paid", "delivered"].forEach(status => render_order_group(orders, status));
}

async function load_recent_orders() {
    try {
        render_recent_orders(await get_orders());
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error loading recent orders:", error);

        ["pending", "paid", "delivered"].forEach(status => {
            document.getElementById(`recent-${status}`).innerHTML = "";
            document.getElementById(`empty-${status}`).classList.add("d-none");
        });
        document.getElementById("recent-error").classList.remove("d-none");
    }
}

function load_dashboard() {
    load_stats();
    load_recent_orders();
}

document.getElementById("refresh-btn").addEventListener("click", load_dashboard);

window.addEventListener("DOMContentLoaded", load_dashboard);
