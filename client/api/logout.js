import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    logout: `${config.api_src}/api/auth/logout`,
};

async function logout(api_endpoint) {
    const original_html = logout_btn.innerHTML;
    logout_btn.setAttribute("aria-disabled", "true");
    logout_btn.textContent = "Logging out…";

    try {
        const response = await fetch(api_endpoint.logout, {
            method: "POST",
            credentials: "include"
        });

        const body = await response.json().catch(() => ({}));

        if (response.ok) {
            window.location.href = "../index.html";
            return;
        }

        throw new Error(body.error || "Logout failed");
    } catch (error) {
        console.error("Logout failed:", error);
        logout_btn.innerHTML = original_html;
        logout_btn.removeAttribute("aria-disabled");
        logout_btn.title = "Couldn't log out. Please try again.";
    }
}

const logout_btn = document.getElementById("logout-btn");

logout_btn?.addEventListener("click", (event) => {
    event.preventDefault();
    logout(api_endpoint);
});