import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    logout: `${config.api_src}/api/auth/logout`,
};

async function logout(api_endpoint) {
    const response = await fetch(api_endpoint.logout, {
        method: "POST",
        credentials: "include"
    });

    const body = await response.json();

    if (response.ok) {
        window.location.href = "../index.html";
        return;
    }

    console.log(body.error || "Logout failed");
}

const logout_btn = document.getElementById("logout-btn");

logout_btn.addEventListener("click", (event) => {
    event.preventDefault();
    logout(api_endpoint);
});