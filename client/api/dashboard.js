import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    dashboard_stats: `${config.api_src}/api/dashboard/stats`,
    orders: `${config.api_src}/api/orders`
};

let dashboard_stats_ready = false;
let recent_orders_ready = false;
let dashboard_stats_failed = false;
let recent_orders_failed = false;

function apply_dashboard_search() {
    const input = document.getElementById("dashboard-search");
    const status = document.getElementById("dashboard-search-status");
    const query = input.value.trim().toLocaleLowerCase();

    if (!query) {
        document.querySelectorAll(".dash-page .search-hidden").forEach(element => {
            element.classList.remove("search-hidden");
        });
        document.querySelectorAll(".dash-search-empty").forEach(element => {
            element.classList.add("d-none");
        });
        document.getElementById("weekly-sales-empty").classList.remove("search-hidden");
        document.getElementById("stock-alert-empty").classList.remove("search-hidden");
        document.getElementById("top-products-empty").classList.remove("search-hidden");
        ["pending", "paid", "delivered"].forEach(order_status => {
            document.getElementById(`empty-${order_status}`).classList.remove("search-hidden");
        });
        document.getElementById("weekly-sales").classList.toggle(
            "d-none",
            document.getElementById("weekly-sales").dataset.hasData !== "true"
        );
        status.textContent = "";
        status.classList.add("d-none");
        return;
    }

    let matches = 0;
    const filter_rows = selector => {
        const rows = [...document.querySelectorAll(selector)];

        rows.forEach(row => {
            const is_match = row.textContent.toLocaleLowerCase().includes(query);
            row.classList.toggle("search-hidden", !is_match);
            matches += Number(is_match);
        });

        return rows;
    };

    const stats = filter_rows("#store-performance .stat-card");
    document.getElementById("store-performance").classList.toggle(
        "search-hidden",
        stats.length > 0 && stats.every(card => card.classList.contains("search-hidden"))
    );

    const sales = filter_rows("#weekly-sales .sales-day");
    const sales_empty = document.getElementById("weekly-sales-empty");
    const sales_search_empty = document.querySelector("#weekly-sales ~ .dash-search-empty");
    const has_matching_sales = sales.some(row => !row.classList.contains("search-hidden"));
    sales_empty.classList.add("search-hidden");
    sales_search_empty.classList.toggle("d-none", has_matching_sales || !dashboard_stats_ready);
    document.getElementById("weekly-sales").classList.toggle("d-none", !has_matching_sales);

    const stock = filter_rows("#stock-alert-list .stock-alert");
    const stock_empty = document.getElementById("stock-alert-empty");
    const stock_search_empty = document.querySelector("#stock-alert-list ~ .dash-search-empty");
    const has_matching_stock = stock.some(row => !row.classList.contains("search-hidden"));
    stock_empty.classList.add("search-hidden");
    stock_search_empty.classList.toggle("d-none", has_matching_stock || !dashboard_stats_ready);

    const products = filter_rows("#top-products tr");
    const products_empty = document.getElementById("top-products-empty");
    const products_search_empty = document.querySelector("#top-products-empty + .dash-search-empty");
    const has_matching_products = products.some(row => !row.classList.contains("search-hidden"));
    products_empty.classList.add("search-hidden");
    products_search_empty.classList.toggle("d-none", has_matching_products || !dashboard_stats_ready);

    filter_rows(".recent-list .recent-item");
    ["pending", "paid", "delivered"].forEach(order_status => {
        const group_orders = document.querySelectorAll(`#recent-${order_status} .recent-item`);
        const empty = document.getElementById(`empty-${order_status}`);
        const search_empty = empty.nextElementSibling;
        const has_matching_orders = [...group_orders].some(order => !order.classList.contains("search-hidden"));
        empty.classList.add("search-hidden");
        search_empty.classList.toggle("d-none", has_matching_orders || !recent_orders_ready);
    });

    status.classList.remove("d-none");
    if (matches > 0) {
        status.textContent = `${matches} matching dashboard ${matches === 1 ? "result" : "results"}.`;
    } else if (dashboard_stats_ready && recent_orders_ready) {
        status.textContent = dashboard_stats_failed || recent_orders_failed
            ? "Some dashboard data could not be searched because it failed to load."
            : `No dashboard results match “${input.value.trim()}”.`;
    } else {
        status.textContent = "Searching dashboard data…";
    }
}

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
    show_number(document.getElementById("stat-orders"), Number(data.paid_orders), value => format_count(Math.round(value)));
    show_number(document.getElementById("stat-revenue"), Number(data.total_revenue), format_peso);
    show_number(document.getElementById("stat-today-sales"), Number(data.today_sales), format_peso);
    show_number(document.getElementById("stat-week-sales"), Number(data.week_sales), format_peso);
    show_number(document.getElementById("stat-month-sales"), Number(data.month_sales), format_peso);
    show_number(document.getElementById("stat-pending"), Number(data.pending_orders), value => format_count(Math.round(value)));
    show_number(document.getElementById("stat-customers"), Number(data.total_customers), value => format_count(Math.round(value)));
    document.getElementById("stat-paid-today").textContent = format_count(data.paid_orders_today);
    document.getElementById("stat-low-stock").textContent = format_count(
        Number(data.low_stock_products) + Number(data.out_of_stock_products)
    );

    render_weekly_sales(data.daily_sales, data.dashboard_date);
    render_stock_alerts(data.stock_alerts);
    render_top_products(data.top_products);
    apply_dashboard_search();
}

function show_error(text) {
    const error_box = document.getElementById("dash-error");

    error_box.querySelector("span").textContent = text;
    error_box.classList.remove("d-none");

    [
        "stat-products",
        "stat-orders",
        "stat-today-sales",
        "stat-week-sales",
        "stat-month-sales",
        "stat-pending",
        "stat-customers"
    ].forEach(id => {
        document.getElementById(id).textContent = "–";
    });
    document.getElementById("stat-revenue").textContent = "–";
    document.getElementById("stat-paid-today").textContent = "–";
    document.getElementById("stat-low-stock").textContent = "–";

    document.getElementById("weekly-sales").replaceChildren();
    document.getElementById("weekly-sales").classList.add("d-none");
    document.getElementById("weekly-sales").dataset.hasData = "false";
    document.getElementById("weekly-sales-empty").textContent = "Sales data is unavailable.";
    document.getElementById("weekly-sales-empty").classList.remove("d-none");

    document.getElementById("stock-alert-list").replaceChildren();
    document.getElementById("stock-alert-empty").textContent = "Inventory data is unavailable.";
    document.getElementById("stock-alert-empty").classList.remove("d-none");

    document.getElementById("top-products").replaceChildren();
    document.getElementById("top-products-empty").textContent = "Product sales data is unavailable.";
    document.getElementById("top-products-empty").classList.remove("d-none");
    dashboard_stats_ready = true;
    apply_dashboard_search();
}

function parse_date_key(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
}

function date_key(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function render_weekly_sales(daily_sales, dashboard_date) {
    const container = document.getElementById("weekly-sales");
    const template = document.getElementById("weekly-sales-template");
    const empty = document.getElementById("weekly-sales-empty");
    const sales_by_date = new Map(
        (daily_sales || []).map(day => [String(day.sale_date), Number(day.sales)])
    );
    const today = parse_date_key(dashboard_date);
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const days = Array.from({ length: ((today.getDay() + 6) % 7) + 1 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(date.getDate() + index);
        return {
            date,
            sales: sales_by_date.get(date_key(date)) || 0
        };
    });
    const maximum = Math.max(...days.map(day => day.sales), 0);
    const total = days.reduce((sum, day) => sum + day.sales, 0);

    container.replaceChildren();
    empty.classList.toggle("d-none", total > 0);
    container.classList.toggle("d-none", total === 0);
    container.dataset.hasData = String(total > 0);

    days.forEach(day => {
        const row = template.content.cloneNode(true);
        const label = row.querySelector(".sales-day-label");
        const fill = row.querySelector(".sales-fill");

        label.textContent = new Intl.DateTimeFormat("en-PH", { weekday: "short" }).format(day.date);
        label.title = new Intl.DateTimeFormat("en-PH", {
            weekday: "long",
            month: "short",
            day: "numeric"
        }).format(day.date);
        fill.style.width = maximum > 0 ? `${(day.sales / maximum) * 100}%` : "0%";
        fill.setAttribute("aria-label", format_peso(day.sales));
        row.querySelector(".sales-day-total").textContent = format_peso(day.sales);
        container.appendChild(row);
    });
}

function render_stock_alerts(products) {
    const container = document.getElementById("stock-alert-list");
    const template = document.getElementById("stock-alert-template");
    const empty = document.getElementById("stock-alert-empty");

    container.replaceChildren();
    empty.classList.toggle("d-none", products.length > 0);

    products.forEach(product => {
        const row = template.content.cloneNode(true);
        const is_out = Number(product.stocks) === 0;

        row.querySelector(".stock-alert-name").textContent = product.name;
        row.querySelector(".stock-alert-count").textContent = `Product #${product.id}`;
        row.querySelector(".stock-alert-pill").textContent = is_out
            ? "Out of stock"
            : `${product.stocks} left`;
        row.querySelector(".stock-alert-pill").classList.toggle("is-out", is_out);
        container.appendChild(row);
    });
}

function render_top_products(products) {
    const container = document.getElementById("top-products");
    const template = document.getElementById("top-product-template");
    const empty = document.getElementById("top-products-empty");

    container.replaceChildren();
    empty.classList.toggle("d-none", products.length > 0);

    products.forEach(product => {
        const row = template.content.cloneNode(true);

        row.querySelector(".top-product-name").textContent = product.name;
        row.querySelector(".top-product-units").textContent = format_count(product.units_sold);
        row.querySelector(".top-product-sales").textContent = format_peso(product.sales);
        container.appendChild(row);
    });
}

async function load_stats() {
    set_loading(true);

    try {
        const data = await get_stats();

        set_loading(false);
        dashboard_stats_ready = true;
        dashboard_stats_failed = false;
        render_stats(data);
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error loading dashboard stats:", error);

        set_loading(false);
        dashboard_stats_ready = true;
        dashboard_stats_failed = true;
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

function format_payment_method(value) {
    const method = String(value || "").trim();

    if (!method) {
        return "Payment method unavailable";
    }

    return method.toLowerCase() === "gcash"
        ? "GCash"
        : `${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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
        node.querySelector(".recent-customer").append(document.createTextNode(
            order.username || (order.user_id ? `Customer #${order.user_id}` : "Customer unavailable")
        ));
        const item_count = Number(order.item_count);
        node.querySelector(".recent-items").append(document.createTextNode(
            Number.isFinite(item_count)
                ? `${format_count(item_count)} ${item_count === 1 ? "item" : "items"}`
                : "Items unavailable"
        ));
        node.querySelector(".recent-payment").append(document.createTextNode(
            format_payment_method(order.payment_method)
        ));
        node.querySelector(".recent-total").textContent = format_peso(order.total);

        list.appendChild(node);
    });
}

function render_recent_orders(orders) {
    document.getElementById("recent-error").classList.add("d-none");

    ["pending", "paid", "delivered"].forEach(status => render_order_group(orders, status));
    recent_orders_ready = true;
    recent_orders_failed = false;
    apply_dashboard_search();
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
        recent_orders_failed = true;

        ["pending", "paid", "delivered"].forEach(status => {
            document.getElementById(`recent-${status}`).innerHTML = "";
            document.getElementById(`empty-${status}`).classList.add("d-none");
        });
        document.getElementById("recent-error").classList.remove("d-none");
        recent_orders_ready = true;
        apply_dashboard_search();
    }
}

async function load_dashboard() {
    await load_stats();
    await load_recent_orders();
}

const reveal_observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("in");
            reveal_observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });

document.querySelectorAll(".dash-page .reveal").forEach(element => {
    reveal_observer.observe(element);
});

document.getElementById("refresh-btn").addEventListener("click", load_dashboard);
document.getElementById("dashboard-search-form").addEventListener("submit", event => {
    event.preventDefault();
    document.getElementById("dashboard-search").focus();
});
document.getElementById("dashboard-search").addEventListener("input", apply_dashboard_search);

window.addEventListener("DOMContentLoaded", load_dashboard);
