import { get_config } from "../config.js";

const config = get_config();
const orders_endpoint = `${config.api_src}/api/orders`;
const valid_statuses = new Set(["pending", "paid", "delivered", "cancelled"]);
let all_orders = [];

function format_peso(amount) {
    return `₱${Number(amount || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function format_date(value) {
    const date = new Date(String(value || "").replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function format_period_date(value) {
    if (!value) {
        return "";
    }

    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function order_date_key(order) {
    const date = String(order.date_created || "");
    return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : "";
}

function order_status(order) {
    const status = String(order.status || "").toLowerCase();
    return valid_statuses.has(status) ? status : "unknown";
}

function filtered_orders() {
    const start = document.getElementById("report-start").value;
    const end = document.getElementById("report-end").value;
    const status = document.getElementById("report-status").value;

    return all_orders.filter(order => {
        const date = order_date_key(order);
        const order_state = order_status(order);

        return (!start || (date && date >= start))
            && (!end || (date && date <= end))
            && (status === "all" || order_state === status);
    });
}

function append_cell(row, value, class_name = "") {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (class_name) {
        cell.className = class_name;
    }
    row.appendChild(cell);
}

function render_report() {
    const orders = filtered_orders().sort((first, second) => {
        return String(second.date_created || "").localeCompare(String(first.date_created || ""))
            || Number(second.id) - Number(first.id);
    });
    const paid_orders = orders.filter(order => ["paid", "delivered"].includes(order_status(order)));
    const pending_orders = orders.filter(order => order_status(order) === "pending");
    const cancelled_orders = orders.filter(order => order_status(order) === "cancelled");
    const revenue = paid_orders.reduce((sum, order) => {
        const total = Number(order.total);
        return sum + (Number.isFinite(total) ? total : 0);
    }, 0);

    document.getElementById("report-order-count").textContent = orders.length.toLocaleString("en-PH");
    document.getElementById("report-paid-count").textContent = paid_orders.length.toLocaleString("en-PH");
    document.getElementById("report-pending-count").textContent = pending_orders.length.toLocaleString("en-PH");
    document.getElementById("report-cancelled-count").textContent = cancelled_orders.length.toLocaleString("en-PH");
    document.getElementById("report-revenue").textContent = format_peso(revenue);

    const start = document.getElementById("report-start").value;
    const end = document.getElementById("report-end").value;
    const period = start || end
        ? `${start ? format_period_date(start) : "All dates"} – ${end ? format_period_date(end) : "Present"}`
        : "All order dates";
    document.getElementById("report-period").textContent =
        `${period} · ${document.getElementById("report-status").selectedOptions[0].text}`;
    document.getElementById("report-generated").textContent =
        `Generated ${new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}`;

    const tbody = document.getElementById("report-orders");
    tbody.replaceChildren();
    orders.forEach(order => {
        const row = document.createElement("tr");
        append_cell(row, `#${order.id}`);
        append_cell(row, format_date(order.date_created));
        append_cell(row, order.username || "Deleted user");
        append_cell(row, order_status(order).replace(/^./, letter => letter.toUpperCase()));
        append_cell(row, String(order.payment_method || "Unavailable").replace(/^./, letter => letter.toUpperCase()));
        append_cell(row, Number(order.item_count || 0).toLocaleString("en-PH"), "text-end");
        append_cell(row, format_peso(order.total), "text-end");
        tbody.appendChild(row);
    });

    document.getElementById("report-empty").classList.toggle("d-none", orders.length > 0);
}

async function load_orders() {
    const state = document.getElementById("report-state");
    const error = document.getElementById("report-error");
    const sheet = document.getElementById("report-sheet");
    const print_button = document.getElementById("print-report");

    state.textContent = "Loading orders…";
    state.classList.remove("d-none");
    error.classList.add("d-none");
    sheet.classList.add("d-none");
    print_button.disabled = true;

    try {
        const response = await fetch(orders_endpoint, {
            method: "GET",
            credentials: "include"
        });

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (response.status === 403) {
            throw new Error("Only admins can view order reports.");
        }

        if (!response.ok) {
            throw new Error(`Failed to load orders (${response.status}).`);
        }

        const data = await response.json();
        all_orders = Array.isArray(data) ? data : data.orders;
        if (!Array.isArray(all_orders)) {
            throw new Error("The orders response has an invalid format.");
        }

        state.classList.add("d-none");
        sheet.classList.remove("d-none");
        print_button.disabled = false;
        render_report();
    } catch (load_error) {
        console.error("Error loading order report:", load_error);
        state.classList.add("d-none");
        error.classList.remove("d-none");
        error.querySelector("strong").textContent = load_error.message === "Only admins can view order reports."
            ? "Admins only"
            : "Couldn't load orders";
        error.querySelector("p").textContent = load_error.message;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const filters = document.getElementById("report-filters");
    filters.addEventListener("submit", event => {
        event.preventDefault();
        const error = document.getElementById("report-filter-error");
        const start = document.getElementById("report-start").value;
        const end = document.getElementById("report-end").value;

        if (start && end && start > end) {
            error.textContent = "The start date must be on or before the end date.";
            error.classList.remove("d-none");
            return;
        }

        error.classList.add("d-none");
        render_report();
    });

    document.getElementById("print-report").addEventListener("click", () => window.print());
    document.getElementById("retry-report").addEventListener("click", load_orders);
    load_orders();
});
