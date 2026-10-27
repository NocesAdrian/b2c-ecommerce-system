import { get_config } from "../config.js";
import { initQuantityController } from "../scripts/view-product.js";

const config = get_config();

const api_endpoint = {
    product: `${config.api_src}/api/products/product`,
    addCartItem: `${config.api_src}/api/carts/items/create`,
};

async function add_to_cart(api_endpoint) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        console.error("Product ID is missing from the URL.");
        return;
    }

    const qty = document.getElementById("qty").value;

    if (!Number.isInteger(Number(qty)) || Number(qty) < 1) {
        console.error("Quantity must be a positive integer.");
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

        console.log("Cart API status:", response.status);
        console.log("Cart API response:", body);

        if (response.status === 201) {
            console.log("Added to cart");
            return
        } 

        if (response.status === 200) {
            console.log("cart updated");
            return
        }

        console.error(
            body.error || `Failed to add product to cart. Status: ${response.status}`
        );

        

    } catch (error) {
        console.error("Request failed:", error);
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

    if (!id) {
        console.error("Product ID is missing from the URL.");
        return;
    }

    const response = await fetch(api_endpoint.product, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: Number(id) })
    });

    const body = await response.json();

    if (response.ok) {
        product_image.src = new URL(body.image_path, config.api_src).href;
        product_image.alt = body.name;

        product_category.textContent = body.category;
        product_name.textContent = body.name;
        product_description.textContent = body.description;
        product_price.textContent = `₱${Number(body.unit_price).toFixed(2)}`;
        product_stocks.textContent = body.stocks;

        product.dataset.price = Number(body.unit_price).toFixed(2);
        product.dataset.stock = body.stocks;
        subtotal.textContent = `₱${Number(body.unit_price).toFixed(2)}`;

        initQuantityController();

        return body;
    }

    console.error(body.error || "Failed to load product.");
    return null;
}

window.addEventListener("DOMContentLoaded", () => {
    render_product(api_endpoint);
});

function goBrowse() {
    window.open("customer.html", "_blank");
    window.close();
}
const add_to_cart_btn = document.getElementById("addBtn");
add_to_cart_btn.addEventListener("click", () => {   
    add_to_cart(api_endpoint)
    setTimeout(goBrowse, 1000);
});