import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    login: `${config.api_src}/api/auth/login`,
    auth: `${config.api_src}/api/auth`,
    updates: `${config.api_src}/api/customer-service/updates`,
    greeting: `${config.api_src}/api/customer-service/greeting`,
}

const role_admin = 1;
const greeting_key_prefix = "customer-service-greeting-v1-";
let session_check_timer;

// Pages only admins may open (matched by file name)
const admin_pages = ["admin.html", "products.html", "orders.html", "reports.html", "users.html"];

function current_page() {
    return window.location.pathname.split("/").pop() || "index.html";
}

function is_admin_page() {
    return admin_pages.includes(current_page());
}

// Admin pages stay invisible until the server confirms the user is an admin,
// so a customer never sees them, not even for a moment.
if (is_admin_page()) {
    document.documentElement.style.visibility = "hidden";
}

function go_to(page_name) {
    const in_pages = window.location.pathname.includes("/pages/");

    window.location.replace(in_pages ? page_name : `pages/${page_name}`);
}

function go_to_index() {
    window.location.replace(window.location.pathname.includes("/pages/")
        ? "../index.html"
        : "index.html");
}

function schedule_session_check(expires_in) {
    const remaining_seconds = Number(expires_in);
    if (!Number.isFinite(remaining_seconds) || remaining_seconds < 0) {
        console.error("The server returned an invalid session expiry.");
        return;
    }

    window.clearTimeout(session_check_timer);
    const delay = Math.max(1000, Math.min(remaining_seconds * 1000, 2_147_483_647));
    session_check_timer = window.setTimeout(() => auth(api_endpoint), delay);
}

function show_login_updates(updates, user) {
    const lines = [];

    if (updates.role === "customer") {
        for (const order of updates.orders || []) {
            lines.push(`Order #${order.id}: ${order.status}.`);
        }
    } else {
        lines.push(`${updates.pending_orders} order${updates.pending_orders === 1 ? "" : "s"} awaiting action.`);
        for (const order of updates.recent_orders || []) {
            lines.push(`Order #${order.id}: ${order.status}.`);
        }
    }

    const products = updates.new_products || [];
    if (products.length > 0) {
        lines.push(`New this week: ${products.map(product => product.name).join(", ")}.`);
    }

    if (lines.length === 0) {
        lines.push("No new order or product updates right now.");
    }

    show_login_notification("Your store update", lines.join(" "), user);
}

function show_login_notification(title_text, message, user) {
    const container = document.createElement("div");
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    container.style.zIndex = "1090";

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");

    const header = document.createElement("div");
    header.className = "toast-header";
    const title = document.createElement("strong");
    title.className = "me-auto";
    title.textContent = title_text;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn-close";
    close.setAttribute("data-bs-dismiss", "toast");
    close.setAttribute("aria-label", "Close");
    header.append(title, close);

    const body = document.createElement("div");
    body.className = "toast-body";
    const summary = document.createElement("p");
    summary.className = "mb-2";
    summary.textContent = message;
    const link = document.createElement("a");
    link.href = user.role_id === role_admin ? "customer-service.html?from=admin" : "customer-service.html";
    link.textContent = "Ask customer service";
    body.append(summary, link);
    toast.append(header, body);
    container.append(toast);
    document.body.append(container);

    if (window.bootstrap?.Toast) {
        window.bootstrap.Toast.getOrCreateInstance(toast, { delay: 12000 }).show();
    } else {
        toast.classList.add("show");
    }
}

async function load_login_updates(user) {
    if (!["customer.html", "admin.html"].includes(current_page())) {
        return;
    }

    const key = `${greeting_key_prefix}${user.user_id}`;
    if (sessionStorage.getItem(key)) {
        return;
    }

    try {
        const response = await fetch(api_endpoint.greeting, {
            method: "GET",
            credentials: "include"
        });
        const body = await response.json();

        if (!response.ok) {
            throw new Error(body.error || "Couldn't load the AI login greeting.");
        }

        if (typeof body.greeting !== "string" || !body.greeting.trim()) {
            throw new Error("The AI login greeting was empty.");
        }

        sessionStorage.setItem(key, "shown");
        show_login_notification("Welcome back", body.greeting.trim(), user);
    } catch (error) {
        console.error("Failed to load AI login greeting:", error);
        try {
            const response = await fetch(api_endpoint.updates, {
                method: "GET",
                credentials: "include"
            });
            const updates = await response.json();

            if (!response.ok) {
                throw new Error(updates.error || "Couldn't load store updates.");
            }

            sessionStorage.setItem(key, "shown");
            show_login_updates(updates, user);
        } catch (fallback_error) {
            console.error("Failed to load fallback login updates:", fallback_error);
        }
    }
}

async function auth(api_endpoint) {
    const username = document.getElementById("username-display");

    try {
        const response = await fetch(api_endpoint.auth, {
            method: "GET",
            credentials: "include"
        });

        const body = await response.json();

        if (response.ok && body.authenticated) {
            schedule_session_check(body.expires_in);

            if (is_admin_page()) {
                const role_id = Number(body.user.role_id);

                if (role_id !== role_admin) {
                    if (body.user.role_id === undefined) {
                        console.warn("/api/auth did not return user.role_id, so admin pages stay locked.");
                    }

                    // logged in, but not an admin: send them to their own page
                    go_to("customer.html");
                    return null;
                }

                document.documentElement.style.visibility = "";
            }

            username.textContent = body.user.username;
            await load_login_updates(body.user);
            return;
        }
    } catch (error) {
        console.error("Error checking the session:", error);
        schedule_session_check(30);

        // can't confirm who this is: customer pages carry on, admin pages stay locked
        if (!is_admin_page()) {
            return null;
        }
    }

    go_to_index();

    return null;
}

window.addEventListener("load", () => {
    auth(api_endpoint);
});
