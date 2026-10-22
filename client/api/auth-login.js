import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    login: `${config.api_src}/api/auth/login`,
    auth: `${config.api_src}/api/auth`,
}

async function auth(api_endpoint) {
    const response = await fetch(api_endpoint.auth, {
        method: "GET",
        credentials: "include"
    });

    const body = await response.json();

    if (response.ok && body.authenticated) {
        console.log(body.user);
        if (body.user.role_id > 1) {
            window.location.href = "customer.html";
            return;
        }

        window.location.href = "admin.html";
        return;
    }
    console.log("Not authenticated");

}

window.addEventListener("load", () => {
    console.log("Page fully loaded!");
    auth(api_endpoint);
});