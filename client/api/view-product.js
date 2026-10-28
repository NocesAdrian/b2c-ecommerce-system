import { get_config } from "../config.js";
import { initQuantityController } from "../scripts/view-product.js";
import { refresh_checkout_bar } from "./cart-bar.js";

const config = get_config();

const api_endpoint = {
    product: `${config.api_src}/api/products/product`,
    addCartItem: `${config.api_src}/api/carts/items/create`,
};

async function add_to_cart(api_endpoint) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const hint = document.getElementById("qtyHint");
    const button = document.getElementById("addBtn");

    if (!id) {
        hint.textContent = "This product could not be found.";
        return;
    }

    const qty = document.getElementById("qty").value;

    if (!Number.isInteger(Number(qty)) || Number(qty) < 1) {
        hint.textContent = "Choose a valid quantity.";
        return;
    }

    const item = {
        "product_id": id,
        "quantity": Number(qty)
    };

    try {
        const response = await fetch(api_endpoint.addCartItem, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(item)
        });

        const body = await response.json().catch(() => ({}));

        if (response.status === 401) {
            window.location.href = "login.html";
            return false;
        }

        if (!response.ok) {
            const error = new Error(body.error || "Couldn't add this item to your cart.");
            error.status = response.status;
            throw error;
        }

        return true;
    } catch (error) {
        console.error("Request failed:", error);
        hint.textContent = error.message || "Couldn't add this item. Please try again.";
        return false;
    }
}

async function render_product(api_endpoint) {
    const product_category = document.getElementById("product-category");
    const product_name = document.getElementById("product-name");
    const product_description = document.getElementById("product-description");
    const product_price = document.getElementById("product-price");
    const product_stocks = document.getElementById("stockCount");
    const product_image = document.getElementById("product-image");

    const product = document.getElementById("product");
    const subtotal = document.getElementById("subtotal");



    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const add_button = document.getElementById("addBtn");
    add_button.disabled = true;

    if (!id) {
        product_name.textContent = "Product unavailable";
        product_description.textContent = "This product link is missing a product ID.";
        return;
    }

    try {
        const response = await fetch(api_endpoint.product, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id: Number(id) })
        });

        const body = await response.json().catch(() => ({}));

        if (response.ok && body && body.id) {
            product_image.src = new URL(body.image_path, config.api_src).href;
            product_image.alt = body.name;

            product_category.textContent = body.category || "Merchandise";
            product_name.textContent = body.name;
            product_description.textContent = body.description || "";
            product_price.textContent = `₱${Number(body.unit_price).toFixed(2)}`;
            document.getElementById("stockLabel").textContent =
                Number(body.stocks) > 0 ? "in stock" : "out of stock";
            product_stocks.textContent = body.stocks;

            product.dataset.price = Number(body.unit_price).toFixed(2);
            product.dataset.stock = body.stocks;
            subtotal.textContent = `₱${Number(body.unit_price).toFixed(2)}`;

            initQuantityController();

            return body;
        }

        product_name.textContent = "Product unavailable";
        product_description.textContent = body.error || "This product may have been removed.";
        return null;
    } catch (error) {
        console.error("Failed to load product:", error);
        product_name.textContent = "Couldn't load product";
        product_description.textContent = "Check your connection and try again.";
        document.getElementById("qtyHint").textContent = "Product details are unavailable.";
        return null;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    render_product(api_endpoint);
});

const add_to_cart_btn = document.getElementById("addBtn");
add_to_cart_btn.addEventListener("click", async () => {
    const hint = document.getElementById("qtyHint");
    const original_html = add_to_cart_btn.innerHTML;

    add_to_cart_btn.disabled = true;
    hint.textContent = "";
    add_to_cart_btn.querySelector("span").textContent = "Adding…";

    const added = await add_to_cart(api_endpoint);

    if (added) {
        await refresh_checkout_bar();
        add_to_cart_btn.classList.add("added");
        add_to_cart_btn.innerHTML =
            `<i class="bi bi-check2 me-2"></i><span>Added to cart</span>`;
        hint.textContent = "This item is in your cart. You can keep browsing or open your cart.";
        add_to_cart_btn.disabled = false;
        window.setTimeout(() => {
            add_to_cart_btn.classList.remove("added");
            add_to_cart_btn.innerHTML = original_html;
        }, 1800);
    } else {
        add_to_cart_btn.disabled = false;
        add_to_cart_btn.innerHTML = original_html;
    }
});