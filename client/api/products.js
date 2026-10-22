
import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    products: `${config.api_src}/api/products`
};

async function get_products() {
    const response = await fetch(api_endpoint.products, {
        method: "GET"
    });

    if (!response.ok) {
        throw new Error("Failed to fetch products");
    }

    return await response.json();
}

function render_products(products) {
    const template = document.getElementById("product-card-template");
    const container = document.getElementById("product-list");

    if (!template || !container) {
        console.error("Product template or container not found.");
        return;
    }

    container.innerHTML = "";

    products.forEach(product => {
        const clone = template.content.cloneNode(true);

        const card = clone.querySelector(".product-card");
        const image = clone.querySelector(".product-card-photo");
        const title = clone.querySelector(".product-card-title");
        const price = clone.querySelector(".product-card-price");

        // Image path is relative to the API origin
        image.src = new URL(product.image_path, config.api_src).href;
        image.alt = product.name;

        title.textContent = product.name;
        price.textContent = `₱${Number(product.unit_price).toLocaleString(
            "en-PH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )}`;

        // Optional: pass product ID to the product page
        card.href = `view-product.html?id=${encodeURIComponent(product.id)}`;

        container.appendChild(clone);
    });
}

async function load_products() {
    try {
        const products = await get_products();
        render_products(products);
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

window.addEventListener("DOMContentLoaded", load_products);
