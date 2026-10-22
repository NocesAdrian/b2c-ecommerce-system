import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    login: `${config.api_src}/api/auth/login`,
    auth: `${config.api_src}/api/auth`,
}

async function auth(api_endpoint) {
    const username = document.getElementById("username-display");

    const response = await fetch(api_endpoint.auth, {
        method: "GET",
        credentials: "include"
    });

    const body = await response.json();

    if (response.ok && body.authenticated) {
        username.textContent = body.user.username;
        return;
    }

    window.location.href = window.location.pathname.includes("/pages/")
        ? "../index.html"
        : "index.html";

    return null;
}

window.addEventListener("load", () => {
    console.log("Page fully loaded!");
    auth(api_endpoint);
});