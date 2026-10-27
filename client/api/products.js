import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    products: `${config.api_src}/api/products`,
    categories: `${config.api_src}/api/categories`
};

let all_products = [];
let categories = [];
let active_category = ""; // "" means every category

async function get_products() {
    const response = await fetch(api_endpoint.products, {
        method: "GET"
    });

    if (!response.ok) {
        throw new Error("Failed to fetch products");
    }

    return await response.json();
}

async function get_categories() {
    const response = await fetch(api_endpoint.categories, {
        method: "GET"
    });

    if (!response.ok) {
        throw new Error("Failed to fetch categories");
    }

    return await response.json();
}

function category_name(category_id) {
    const category = categories.find(item => String(item.id) === String(category_id));

    return category ? category.name : "";
}

// One search bar: every word typed must match the product name,
// its description or the name of the category it is in.
function matches(product, words) {
    if (words.length === 0) {
        return true;
    }

    const haystack = [
        product.name,
        product.description,
        category_name(product.category_id)
    ].join(" ").toLowerCase();

    return words.every(word => haystack.includes(word));
}

function show_message(container, icon, title, text) {
    const wrapper = document.createElement("div");

    wrapper.className = "col-12";
    wrapper.innerHTML = `
        <div class="text-center py-5">
          <i class="bi ${icon} fs-1" style="color: var(--accent)"></i>
          <h3 class="h5 mt-3 mb-1"></h3>
          <p class="text-muted-d mb-0"></p>
        </div>`;

    wrapper.querySelector("h3").textContent = title;
    wrapper.querySelector("p").textContent = text;

    container.appendChild(wrapper);
}

// A card's picture takes the shape of the image itself (kept within
// a sensible range), so the cards come out in different sizes.
function fit_to_image(image, box) {
    const apply = () => {
        if (!image.naturalWidth || !image.naturalHeight) {
            return;
        }

        const ratio = image.naturalWidth / image.naturalHeight;

        box.style.aspectRatio = String(Math.min(1.5, Math.max(0.7, ratio)));
    };

    image.addEventListener("load", apply);

    if (image.complete) {
        apply();
    }
}

function build_card(product) {
    const template = document.getElementById("product-card-template");
    const clone = template.content.cloneNode(true);

    const card = clone.querySelector(".product-card");
    const box = clone.querySelector(".product-card-img");
    const image = clone.querySelector(".product-card-photo");
    const title = clone.querySelector(".product-card-title");
    const price = clone.querySelector(".product-card-price");

    fit_to_image(image, box);

    // Image path is relative to the API origin
    if (product.image_path) {
        image.src = new URL(product.image_path, config.api_src).href;
    }

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

    return clone;
}

// Every product in one grid. The category chips decide what is shown.
function build_grid(items) {
    const section = document.createElement("section");
    const grid = document.createElement("div");

    section.className = "col-12";
    grid.className = "masonry";

    items.forEach(product => grid.appendChild(build_card(product)));
    section.appendChild(grid);

    return section;
}

function render_products(products, filtering = false) {
    const template = document.getElementById("product-card-template");
    const container = document.getElementById("product-list");

    if (!template || !container) {
        console.error("Product template or container not found.");
        return;
    }

    container.innerHTML = "";

    if (products.length === 0) {
        if (filtering) {
            show_message(container, "bi-search", "No matches", "Try another word, or a category name.");
        } else {
            show_message(container, "bi-box-seam", "Nothing here yet", "New merchandise will show up soon.");
        }

        return;
    }

    container.appendChild(build_grid(products));
}

// Category chips: "All" plus every category that has at least one product.
function build_chips() {
    const rail = document.getElementById("category-chips");

    if (!rail) {
        return;
    }

    const used = new Set(all_products.map(product => String(product.category_id)));
    const options = categories
        .filter(category => used.has(String(category.id)))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    rail.innerHTML = "";

    // a single category would make the chips pointless
    if (options.length < 2) {
        rail.hidden = true;
        return;
    }

    const make_chip = (id, label) => {
        const chip = document.createElement("button");

        chip.type = "button";
        chip.className = "ba-chip";
        chip.dataset.category = id;
        chip.textContent = label;
        chip.setAttribute("aria-pressed", String(id === active_category));

        return chip;
    };

    rail.append(
        make_chip("", "All"),
        ...options.map(category => make_chip(String(category.id), category.name))
    );

    rail.hidden = false;
}

function sync_chips() {
    document.querySelectorAll("#category-chips .ba-chip").forEach(chip => {
        chip.setAttribute("aria-pressed", String(chip.dataset.category === active_category));
    });
}

function apply_search() {
    const input = document.getElementById("product-search");
    const words = (input ? input.value : "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    const visible = all_products.filter(product => {
        const in_category = active_category === "" || String(product.category_id) === active_category;

        return in_category && matches(product, words);
    });

    render_products(visible, words.length > 0 || active_category !== "");
}

async function load_products() {
    try {
        // categories are only used for searching, so a failure here is not fatal
        const [products, category_list] = await Promise.all([
            get_products(),
            get_categories().catch(error => {
                console.error("Error loading categories:", error);
                return [];
            })
        ]);

        all_products = Array.isArray(products) ? products : (products.products || []);
        categories = Array.isArray(category_list) ? category_list : (category_list.categories || []);

        build_chips();
        apply_search();
    } catch (error) {
        console.error("Error loading products:", error);

        const container = document.getElementById("product-list");

        if (container) {
            container.innerHTML = "";
            show_message(container, "bi-wifi-off", "Couldn't load the shelves", "Check your connection and refresh the page.");
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("product-search");
    const rail = document.getElementById("category-chips");

    if (input) {
        input.addEventListener("input", apply_search);
    }

    if (rail) {
        rail.addEventListener("click", event => {
            const chip = event.target.closest(".ba-chip");

            if (!chip) {
                return;
            }

            active_category = chip.dataset.category;
            sync_chips();
            apply_search();
        });
    }

    load_products();
});
