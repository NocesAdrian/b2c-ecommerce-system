import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    auth: `${config.api_src}/api/auth`,
    account: `${config.api_src}/api/users/profile/update`,
    location: `${config.api_src}/api/delivery_locations/location`,
    update_location: `${config.api_src}/api/delivery_locations/update`
};

const feedback = document.getElementById("profile-feedback");

function show_feedback(message, is_error = false) {
    feedback.textContent = message;
    feedback.classList.toggle("is-error", is_error);
    feedback.classList.toggle("is-success", !is_error);
    feedback.classList.remove("d-none");
}

async function request(url, options = {}) {
    const response = await fetch(url, {
        credentials: "include",
        ...options
    });
    const body = await response.json().catch(() => ({}));

    if (response.status === 401) {
        window.location.replace("login.html");
        throw new Error("Your session has expired. Please sign in again.");
    }

    if (!response.ok) {
        throw new Error(body.error || `Request failed (${response.status})`);
    }

    return body;
}

async function load_profile() {
    try {
        const [auth, location] = await Promise.all([
            request(api_endpoint.auth),
            request(api_endpoint.location)
        ]);

        document.getElementById("profile-username").value = auth.user.username;
        document.getElementById("profile-location").value = location.location || "";
    } catch (error) {
        console.error("Error loading profile:", error);
        show_feedback(error.message || "Couldn't load your profile. Please refresh and try again.", true);
    }
}

async function submit_form(form, url, payload, success_message, reset = false) {
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;

    try {
        const result = await request(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (result.username) {
            document.getElementById("profile-username").value = result.username;
            document.getElementById("username-display").textContent = result.username;
        }

        if (reset) {
            form.reset();
        }

        show_feedback(success_message);
    } catch (error) {
        console.error("Error saving profile:", error);
        show_feedback(error.message || "Couldn't save your changes. Please try again.", true);
    } finally {
        button.disabled = false;
    }
}

document.getElementById("username-form").addEventListener("submit", event => {
    event.preventDefault();
    const username = document.getElementById("profile-username").value.trim();

    if (username.length < 4) {
        show_feedback("Username must contain at least 4 characters.", true);
        return;
    }

    submit_form(event.currentTarget, api_endpoint.account, { username }, "Username updated.");
});

document.getElementById("location-form").addEventListener("submit", event => {
    event.preventDefault();
    const location = document.getElementById("profile-location").value.trim();

    if (!location) {
        show_feedback("Please enter a delivery location.", true);
        return;
    }

    submit_form(event.currentTarget, api_endpoint.update_location, { location }, "Delivery location updated.");
});

document.getElementById("password-form").addEventListener("submit", event => {
    event.preventDefault();
    const current_password = document.getElementById("current-password").value;
    const new_password = document.getElementById("new-password").value;
    const confirm_password = document.getElementById("confirm-password").value;

    if (new_password.length < 4) {
        show_feedback("New password must contain at least 4 characters.", true);
        return;
    }

    if (new_password !== confirm_password) {
        show_feedback("New password and confirmation do not match.", true);
        return;
    }

    submit_form(event.currentTarget, api_endpoint.account, {
        current_password,
        new_password
    }, "Password changed.", true);
});

load_profile();
