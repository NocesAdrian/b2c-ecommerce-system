import { get_config } from "../config.js";

// Shows the checkout bar on any page that has the #checkout-bar markup,
// but only when the logged-in user's cart has items.
// Call refresh_checkout_bar() again after adding or removing an item.

const config = get_config();

const api_endpoint = {
    cart_items: `${config.api_src}/api/carts/items/user`
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

    if (!response.ok) {
        throw new Error("Failed to fetch cart items");
    }

    return await response.json();
}

export async function refresh_checkout_bar() {
    const bar = document.getElementById("checkout-bar");
    const count = document.getElementById("bar-count");
    const total = document.getElementById("bar-total");
    const button = document.getElementById("checkout-btn");

    if (!bar || !count || !total || !button) {
        return;
    }

    try {
        const data = await get_cart_items();
        const items = data.items || [];

        if (items.length === 0) {
            bar.classList.add("d-none");
            button.classList.add("disabled");
            return;
        }

        // "Number of items" = total quantity across all cart rows.
        // Use `items.length` instead for the number of different products.
        const total_quantity = items.reduce((sum, item) => sum + Number(item.product_quantity), 0);

        count.textContent = `${total_quantity} ${total_quantity === 1 ? "item" : "items"} in your cart`;
        total.textContent = format_peso(data.grand_total);

        button.classList.remove("disabled");
        bar.classList.remove("d-none");
    } catch (error) {
        // Not logged in or API unreachable: keep the bar hidden.
        console.error("Error loading checkout bar:", error);
        bar.classList.add("d-none");
    }
}

window.addEventListener("DOMContentLoaded", refresh_checkout_bar);
