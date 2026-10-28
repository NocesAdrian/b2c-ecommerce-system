import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    login: `${config.api_src}/api/auth/login`,
};

function show_login_error(element, message) {
    element.textContent = message;
    element.classList.toggle("d-none", !message);
}

async function login(api_endpoint) {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const remember_me = document.getElementById("remember").checked;
    const errorElement = document.getElementById("login-error");

    show_login_error(errorElement, "");

    if (!username || !password) {
        show_login_error(errorElement, "Please enter your username and password.");
        return;
    }

    const user = { username, password, remember_me };
    const submit_button = document.querySelector("#login-form button[type=submit]");

    submit_button.disabled = true;

    try {
        const response = await fetch(api_endpoint.login, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(user)
        });

        const body = await response.json().catch(() => ({}));

        if (response.status === 200) {
            sessionStorage.removeItem(`customer-service-updates-${body.user.user_id ?? body.user.id}`);
            if (body.user.role_id > 1) {
                window.location.replace("customer.html");
                return;
            }

            window.location.replace("admin.html");
        } else if (response.status === 401) {
            show_login_error(errorElement, body.error || "Incorrect username or password.");
        } else if (response.status === 403) {
            show_login_error(errorElement, body.error || "You don't have permission to access this account.");
        } else if (response.status === 400 || response.status === 422) {
            show_login_error(errorElement, body.error || "Please check your login details.");
        } else {
            show_login_error(errorElement, body.error || "Login failed. Please try again later.");
        }
    } catch (error) {
        console.error("Login request failed:", error);
        show_login_error(errorElement, "Unable to connect to the server. Check your internet connection and try again.");
    } finally {
        submit_button.disabled = false;
    }
}

const form = document.getElementById("login-form");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    login(api_endpoint);
});