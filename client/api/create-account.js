import { get_config } from "../config.js";

const config = get_config();
const api_endpoint = {
    create: `${config.api_src}/api/users/create`,
    login: `${config.api_src}/api/auth/login`,
    create_delivery_location: `${config.api_src}/api/delivery_locations/create`
}

async function create_delivery_location(api_endpoint) {

    const delivery_location = document.getElementById("location").value;

    const newDeliveryLocation = {location: delivery_location};
    const response = await fetch(api_endpoint.create_delivery_location, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(newDeliveryLocation)
    });

    const body = await response.json();

    if (response.status === 201) {
        window.location.href = "customer.html";
    } else {
        console.error(body.error || "Failed to create account");
    }
}

async function login(newUser, api_endpoint) {

    const response = await fetch(api_endpoint.login, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(newUser)
    });

    const body = await response.json();

    if (response.status === 200) {
        await create_delivery_location(api_endpoint);
    } else {
        console.error(body.error || "Failed to create account");
    }
}

async function create_account(api_endpoint) {
    const username = document.getElementById("new-username").value;
    const password = document.getElementById("new-password").value;

    const newUser = { username, password };

    try {
        const response = await fetch(api_endpoint.create, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newUser)
        });

        const body = await response.json();

        if (response.status === 201) {
            await login(newUser, api_endpoint);
        } else {
            console.error(body.error || "Failed to create account");
        }
    } catch (error) {
        console.error("Request failed:", error);
    }
}

const form = document.getElementById("create-account-form");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    create_account(api_endpoint);
});