import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    login: `${config.api_src}/api/auth/login`,
}

async function login(api_endpoint) {

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const remember_me = document.getElementById("remember").checked;

    const user = { username, password, remember_me };

    const response = await fetch(api_endpoint.login, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(user)
    });

    const body = await response.json();

    if (response.status === 200) {
        if (body.user.role_id > 1) {
            window.open("customer.html", "_blank");
            window.close();
            return;
        }

        window.open("admin.html", "_blank");
        window.close();
    } else {
        console.error(body.error || "Failed to create account");
    }
}

const form = document.getElementById("login-form");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    login(api_endpoint);
});