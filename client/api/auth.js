import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    login: `${config.api_src}/api/auth/login`,
    auth: `${config.api_src}/api/auth`,
}

const role_admin = 1;

// Pages only admins may open (matched by file name)
const admin_pages = ["admin.html", "products.html", "orders.html", "users.html"];

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

async function auth(api_endpoint) {
    const username = document.getElementById("username-display");

    try {
        const response = await fetch(api_endpoint.auth, {
            method: "GET",
            credentials: "include"
        });

        const body = await response.json();

        if (response.ok && body.authenticated) {

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
            return;
        }
    } catch (error) {
        console.error("Error checking the session:", error);

        // can't confirm who this is: customer pages carry on, admin pages stay locked
        if (!is_admin_page()) {
            return null;
        }
    }

    go_to_index();

    return null;
}

window.addEventListener("load", () => {
    console.log("Page fully loaded!");
    auth(api_endpoint);
});
