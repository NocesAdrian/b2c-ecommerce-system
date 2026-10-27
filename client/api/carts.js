import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    cart_items: `${config.api_src}/api/carts/items/user`,
    delete_item: `${config.api_src}/api/carts/items/delete`
};

function format_peso(amount) {
    return `₱${Number(amount || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

async function get_cart_items() {
    const response = await fetch(api_endpoint.cart_items, {
        method: "GET",
        credentials: "include" // sends the "token" cookie
    });

    if (response.status === 401) {
        const error = new Error("Session expired or invalid");
        error.status = 401;
        throw error;
    }

    if (!response.ok) {
        throw new Error("Failed to fetch cart items");
    }

    return await response.json();
}

async function delete_cart_item(product_id) {
    const response = await fetch(api_endpoint.delete_item, {
        method: "POST", // change to "DELETE" if your router checks the method
        headers: { "Content-Type": "application/json" },
        credentials: "include", // sends the "token" cookie
        body: JSON.stringify({ product_id })
    });

    if (response.status === 401) {
        const error = new Error("Session expired or invalid");
        error.status = 401;
        throw error;
    }

    // 404 = the item (or cart) is already gone, so there is nothing left to delete
    if (!response.ok && response.status !== 404) {
        throw new Error("Failed to delete cart item");
    }
}

async function refresh_cart() {
    try {
        const data = await get_cart_items();
        render_cart(data);
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error refreshing cart:", error);
        show_state("bi-wifi-off", "Couldn't load your cart", "Check your connection and try again.", true);
    }
}

async function remove_item(product_id, button, error_text) {
    button.disabled = true;
    error_text.classList.add("d-none");

    try {
        await delete_cart_item(product_id);
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error deleting cart item:", error);
        button.disabled = false;
        error_text.classList.remove("d-none");
        return;
    }

    // Reload the list, the item count and the grand total
    await refresh_cart();
}

function show_state(icon, title, text, with_retry = false) {
    const list = document.getElementById("cart-list");
    const state = document.getElementById("cart-state");
    const bar = document.getElementById("checkout-bar");

    list.innerHTML = "";
    bar.classList.add("d-none");
    state.classList.remove("d-none");

    state.innerHTML = `
        <i class="bi ${icon}"></i>
        <h3>${title}</h3>
        <p>${text}</p>
        ${with_retry
            ? '<button type="button" class="btn btn-soft" id="retry-btn">Try again</button>'
            : '<a href="customer.html" class="btn btn-d">Browse products</a>'}`;

    if (with_retry) {
        document.getElementById("retry-btn").addEventListener("click", load_cart);
    }
}

function show_loading() {
    const list = document.getElementById("cart-list");

    document.getElementById("cart-state").classList.add("d-none");
    document.getElementById("checkout-bar").classList.add("d-none");

    list.innerHTML = Array.from({ length: 3 }, () => `
        <div class="col-12 col-lg-6">
            <div class="cart-card cart-skeleton" aria-hidden="true"></div>
        </div>`).join("");
}

function render_cart(data) {
    const template = document.getElementById("cart-card-template");
    const container = document.getElementById("cart-list");
    const state = document.getElementById("cart-state");
    const bar = document.getElementById("checkout-bar");

    if (!template || !container) {
        console.error("Cart template or container not found.");
        return;
    }

    const items = data.items || [];

    if (items.length === 0) {
        show_state("bi-bag", "Your cart is empty", "Add something you like and it will show up here.");
        return;
    }

    state.classList.add("d-none");
    container.innerHTML = "";

    let total_quantity = 0;

    items.forEach(item => {
        const clone = template.content.cloneNode(true);

        const image = clone.querySelector(".cart-photo");
        const name = clone.querySelector(".cart-name");
        const unit = clone.querySelector(".cart-unit");
        const quantity = clone.querySelector(".cart-qty-value");
        const line_total = clone.querySelector(".cart-line-total");

        // Image path is relative to the API origin
        if (item.image_path) {
            image.src = new URL(item.image_path, config.api_src).href;
            image.alt = item.product_name;
        } else {
            image.remove(); // no photo: the soft placeholder block stays
        }

        name.textContent = item.product_name;
        unit.textContent = `${format_peso(item.product_price)} each`;
        quantity.textContent = `× ${item.product_quantity}`;
        line_total.textContent = format_peso(Number(item.product_price) * Number(item.product_quantity));

        const remove_button = clone.querySelector(".cart-remove");
        const error_text = clone.querySelector(".cart-error");

        remove_button.setAttribute("aria-label", `Remove ${item.product_name} from cart`);
        remove_button.addEventListener("click", () => {
            remove_item(item.product_id, remove_button, error_text);
        });

        total_quantity += Number(item.product_quantity);
        container.appendChild(clone);
    });

    // "Number of items" = total quantity across all cards.
    // Use `items.length` instead for the number of different products.
    document.getElementById("bar-count").textContent =
        `${total_quantity} ${total_quantity === 1 ? "item" : "items"} in your cart`;
    document.getElementById("bar-total").textContent = format_peso(data.grand_total);

    document.getElementById("checkout-btn").classList.remove("disabled");
    bar.classList.remove("d-none");
}

async function load_cart() {
    show_loading();

    try {
        const data = await get_cart_items();
        render_cart(data);
    } catch (error) {
        if (error.status === 401) {
            window.location.href = "login.html";
            return;
        }

        console.error("Error loading cart:", error);
        show_state("bi-wifi-off", "Couldn't load your cart", "Check your connection and try again.", true);
    }
}

window.addEventListener("DOMContentLoaded", load_cart);