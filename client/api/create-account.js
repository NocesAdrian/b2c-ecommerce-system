import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    create: `${config.api_src}/api/users/create`,
    login: `${config.api_src}/api/auth/login`,
    create_delivery_location: `${config.api_src}/api/delivery_locations/create`,
    create_cart: `${config.api_src}/api/carts/create`
};

function showAccountError(message) {
    const error = document.getElementById("account-error");

    error.textContent = message;
    error.classList.toggle("d-none", !message);
}

async function create_cart(api_endpoint) {
    try {
        const response = await fetch(api_endpoint.create_cart, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });

        const body = await response.json().catch(() => ({}));

        if (response.ok) {
            await create_delivery_location(api_endpoint);
        } else {
            showAccountError(body.error || "Failed to create cart.");
        }
    } catch (error) {
        console.error("Cart request failed:", error);
        showAccountError("Unable to create your cart. Please try again.");
    }
}

async function create_delivery_location(api_endpoint) {
    try {
        const delivery_location = document.getElementById("location").value;
        const newDeliveryLocation = { location: delivery_location };

        const response = await fetch(api_endpoint.create_delivery_location, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(newDeliveryLocation)
        });

        const body = await response.json().catch(() => ({}));

        if (response.ok) {
            window.location.href = "customer.html";
        } else {
            showAccountError(body.error || "Failed to save delivery location.");
        }
    } catch (error) {
        console.error("Delivery location request failed:", error);
        showAccountError("Unable to save your delivery location. Please try again.");
    }
}

async function login(newUser, api_endpoint) {
    try {
        const response = await fetch(api_endpoint.login, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(newUser)
        });

        const body = await response.json().catch(() => ({}));

        if (response.status === 200) {
            await create_cart(api_endpoint);
        } else {
            showAccountError(body.error || "Account created, but automatic login failed. Please log in.");
        }
    } catch (error) {
        console.error("Login request failed:", error);
        showAccountError("Account created, but login failed. Please try logging in.");
    }
}

async function create_account(api_endpoint) {
    const username = document.getElementById("new-username").value.trim();
    const password = document.getElementById("new-password").value;

    showAccountError("");

    if (!username || username.length > 255 || !password) {
        showAccountError("Please enter a username and password.");
        return;
    }

    if (password.length < 4) {
        showAccountError("Password must contain at least 4 characters.");
        return;
    }

    const newUser = { username, password };

    try {
        const response = await fetch(api_endpoint.create, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newUser)
        });

        const body = await response.json().catch(() => ({}));

        if (response.status === 201) {
            await login(newUser, api_endpoint);
        } else if (response.status === 409) {
            showAccountError(body.error || "Username already exists. Please choose another.");
        } else if (response.status === 400 || response.status === 422) {
            showAccountError(body.error || "Please check your registration details.");
        } else {
            showAccountError(body.error || "Failed to create account. Please try again.");
        }
    } catch (error) {
        console.error("Registration request failed:", error);
        showAccountError("Unable to connect to the server. Check your internet connection and try again.");
    }
}

const form = document.getElementById("create-account-form");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");

    button.disabled = true;
    form.setAttribute("aria-busy", "true");
    create_account(api_endpoint).finally(() => {
        button.disabled = false;
        form.removeAttribute("aria-busy");
    });
});
