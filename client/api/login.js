import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    login: `${config.api_src}/api/auth/login`,
};

async function login(api_endpoint) {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const remember_me = document.getElementById("remember").checked;
    const errorElement = document.getElementById("login-error");

    errorElement.textContent = "";

    if (!username || !password) {
        errorElement.textContent = "Please enter your username and password.";
        return;
    }

    const user = { username, password, remember_me };

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
            if (body.user.role_id > 1) {
                window.open("customer.html", "_blank");
                window.close();
                return;
            }

            window.open("admin.html", "_blank");
            window.close();
        } else if (response.status === 401) {
            errorElement.textContent =
                body.error || "Incorrect username or password.";
        } else if (response.status === 403) {
            errorElement.textContent =
                body.error || "You don't have permission to access this account.";
        } else if (response.status === 400 || response.status === 422) {
            errorElement.textContent =
                body.error || "Please check your login details.";
        } else {
            errorElement.textContent =
                body.error || "Login failed. Please try again later.";
        }
    } catch (error) {
        console.error("Login request failed:", error);
        errorElement.textContent =
            "Unable to connect to the server. Check your internet connection and try again.";
    }
}

const form = document.getElementById("login-form");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    login(api_endpoint);
});