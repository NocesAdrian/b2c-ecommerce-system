import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    products: `${config.api_src}/api/products`,
    product_create: `${config.api_src}/api/products/create`,
    product_update: `${config.api_src}/api/products/update`,
    product_delete: `${config.api_src}/api/products/delete`,
    categories: `${config.api_src}/api/categories`,
    category_create: `${config.api_src}/api/categories/create`,
    category_delete: `${config.api_src}/api/categories/delete`
};

const low_stock_limit = 5;

let all_products = [];
let categories = [];
let search_text = "";
let editing_product = null;   // null = adding a new product
let deleting_product = null;
let product_modal = null;
let delete_modal = null;
let preview_url = null;

function format_peso(amount) {
    return `₱${Number(amount || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function image_url(image_path) {
    if (!image_path) {
        return "";
    }

    return new URL(image_path, config.api_src).href;
}

function category_name(category_id) {
    const category = categories.find(item => String(item.id) === String(category_id));

    return category ? category.name : "";
}

/* ---------------- API ---------------- */

async function request(url, options = {}) {
    const response = await fetch(url, {
        credentials: "include", // sends the "token" cookie
        ...options
    });

    if (response.status === 401) {
        window.location.href = "login.html";
        const error = new Error("Session expired or invalid");
        error.status = 401;
        throw error;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok || (data && data.error)) {
        const error = new Error((data && data.error) || `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }

    return data;
}

async function get_products() {
    const data = await request(api_endpoint.products, { method: "GET" });

    // accepts [..] or { products: [..] }
    return Array.isArray(data) ? data : (data.products || []);
}

async function get_categories() {
    const data = await request(api_endpoint.categories, { method: "GET" });

    return Array.isArray(data) ? data : (data.categories || []);
}

async function save_product(form_data, is_edit) {
    return await request(is_edit ? api_endpoint.product_update : api_endpoint.product_create, {
        method: "POST",
        body: form_data // multipart, the browser sets the Content-Type
    });
}

async function delete_product(id) {
    return await request(api_endpoint.product_delete, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });
}

/* ---------------- List ---------------- */

function matches(product) {
    if (!search_text) {
        return true;
    }

    return [
        product.name,
        product.description,
        category_name(product.category_id),
        `#${product.id}`
    ].join(" ").toLowerCase().includes(search_text);
}

function show_state(icon, title, text, show_retry = false) {
    document.getElementById("products-state-icon").className = `bi ${icon}`;
    document.getElementById("products-state-title").textContent = title;
    document.getElementById("products-state-text").textContent = text;
    document.getElementById("products-retry-btn").classList.toggle("d-none", !show_retry);
    document.getElementById("products-state").classList.remove("d-none");
}

function set_stock_pill(pill, stocks) {
    const icon = pill.querySelector("i");
    const text = pill.querySelector(".stock-text");

    if (stocks <= 0) {
        pill.classList.add("pill-muted");
        icon.className = "bi bi-x-circle";
        text.textContent = "Out of stock";
    } else if (stocks <= low_stock_limit) {
        icon.className = "bi bi-exclamation-circle";
        text.textContent = `Low: ${stocks} left`;
    } else {
        icon.className = "bi bi-box-seam";
        text.textContent = `${stocks} in stock`;
    }
}

function render_products() {
    const container = document.getElementById("product-list");
    const template = document.getElementById("product-admin-template");

    container.innerHTML = "";
    document.getElementById("products-state").classList.add("d-none");

    const shown = all_products
        .filter(matches)
        .sort((a, b) => Number(b.id) - Number(a.id));

    document.getElementById("products-summary").textContent =
        `${shown.length} of ${all_products.length} ${all_products.length === 1 ? "product" : "products"}`;

    if (shown.length === 0) {
        if (all_products.length === 0) {
            show_state("bi-box-seam", "No products yet", "Tap “Add product” to create your first one.");
        } else {
            show_state("bi-search", "No matching products", "Try another search.");
        }
        return;
    }

    shown.forEach(product => {
        const clone = template.content.cloneNode(true);
        const image = clone.querySelector(".product-card-photo");
        const image_box = clone.querySelector(".product-card-img");

        image.addEventListener("error", () => image_box.classList.add("is-missing"));

        if (product.image_path) {
            image.src = image_url(product.image_path);
        } else {
            image_box.classList.add("is-missing");
        }

        image.alt = product.name || "";

        clone.querySelector(".product-card-title").textContent = product.name;
        clone.querySelector(".admin-category").textContent = category_name(product.category_id);
        clone.querySelector(".product-card-price").textContent = format_peso(product.unit_price);

        set_stock_pill(clone.querySelector(".stock-pill"), Number(product.stocks));

        clone.querySelector(".edit-btn").addEventListener("click", () => open_form(product));
        clone.querySelector(".delete-btn").addEventListener("click", () => open_delete(product));

        container.appendChild(clone);
    });
}

async function load_products() {
    document.getElementById("products-summary").textContent = "Loading products…";

    try {
        all_products = await get_products();
        render_products();
    } catch (error) {
        console.error("Error loading products:", error);

        document.getElementById("product-list").innerHTML = "";
        document.getElementById("products-summary").textContent = "";
        show_state(
            "bi-wifi-off",
            "Couldn't load products",
            "Please check your connection and try again.",
            true
        );
    }
}

/* ---------------- Categories ---------------- */

function show_category_error(message) {
    const box = document.getElementById("category-error");

    box.querySelector("span").textContent = message;
    box.classList.toggle("d-none", !message);
}

function fill_category_select(selected_value = "") {
    const select = document.getElementById("field-category");

    select.innerHTML = "";

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = categories.length === 0 ? "No categories yet" : "Choose a category";
    placeholder.disabled = true;
    select.appendChild(placeholder);

    categories.forEach(category => {
        const option = document.createElement("option");

        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });

    set_category_value(selected_value);
}

function render_category_list() {
    const list = document.getElementById("category-list");

    list.innerHTML = "";
    document.getElementById("category-empty").classList.toggle("d-none", categories.length > 0);

    categories.forEach(category => {
        const row = document.createElement("li");

        const name = document.createElement("span");
        name.className = "cat-name";
        name.textContent = category.name;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "cat-delete";
        button.setAttribute("aria-label", `Delete category ${category.name}`);
        button.innerHTML = '<i class="bi bi-trash3"></i>';

        // two taps: the first asks "Sure?", the second deletes
        let reset_timer = null;

        button.addEventListener("click", () => {
            if (!button.classList.contains("is-confirm")) {
                button.classList.add("is-confirm");
                button.textContent = "Sure?";
                reset_timer = setTimeout(() => {
                    button.classList.remove("is-confirm");
                    button.innerHTML = '<i class="bi bi-trash3"></i>';
                }, 3000);
                return;
            }

            clearTimeout(reset_timer);
            handle_delete_category(category, button);
        });

        row.append(name, button);
        list.appendChild(row);
    });
}

async function load_categories(selected_value = null) {
    // keep whatever is picked in the form while the list reloads
    const keep = selected_value ?? get_category_value();

    try {
        categories = await get_categories();
    } catch (error) {
        console.error("Error loading categories:", error);
        categories = [];
        show_category_error("Couldn't load categories.");
    }

    fill_category_select(keep);
    render_category_list();
}

function get_category_value() {
    return document.getElementById("field-category").value;
}

function set_category_value(value) {
    const select = document.getElementById("field-category");

    select.value = value ?? "";

    // the id isn't in the list (or is empty): show the placeholder
    if (select.value !== String(value ?? "")) {
        select.value = "";
    }
}

async function handle_add_category() {
    const input = document.getElementById("new-category-name");
    const button = document.getElementById("add-category-btn");
    const name = input.value.trim();

    if (!name) {
        show_category_error("Please type a category name.");
        return;
    }

    if (categories.some(category => category.name.toLowerCase() === name.toLowerCase())) {
        show_category_error("That category already exists.");
        return;
    }

    button.disabled = true;
    show_category_error("");

    try {
        await request(api_endpoint.category_create, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        input.value = "";
        await load_categories("");

        // pick the category that was just added
        const added = categories.find(category => category.name.toLowerCase() === name.toLowerCase());

        if (added) {
            set_category_value(added.id);
        }
    } catch (error) {
        console.error("Error adding category:", error);
        show_category_error("Couldn't add the category. Please try again.");
    } finally {
        button.disabled = false;
    }
}

async function handle_delete_category(category, button) {
    button.disabled = true;
    show_category_error("");

    try {
        await request(api_endpoint.category_delete, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: category.id })
        });

        await load_categories();
        await load_products(); // products of this category are now uncategorized
    } catch (error) {
        console.error("Error deleting category:", error);

        button.disabled = false;
        button.classList.remove("is-confirm");
        button.innerHTML = '<i class="bi bi-trash3"></i>';
        show_category_error("Couldn't delete the category. Please try again.");
    }
}

function toggle_category_panel(force_open = null) {
    const panel = document.getElementById("category-panel");
    const toggle = document.getElementById("category-toggle");
    const open = force_open ?? panel.classList.contains("d-none");

    panel.classList.toggle("d-none", !open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.lastChild.textContent = open ? "Hide categories" : "Manage categories";
}

/* ---------------- Add / edit popup ---------------- */

function show_form_error(message) {
    const box = document.getElementById("product-form-error");

    box.querySelector("span").textContent = message;
    box.classList.toggle("d-none", !message);
}

function set_preview(url) {
    const image = document.getElementById("image-preview-img");
    const icon = document.getElementById("image-preview-icon");

    if (url) {
        image.src = url;
        image.classList.remove("d-none");
        icon.classList.add("d-none");
    } else {
        image.removeAttribute("src");
        image.classList.add("d-none");
        icon.classList.remove("d-none");
    }
}

function open_form(product = null) {
    editing_product = product;

    document.getElementById("product-form").reset();
    document.getElementById("field-image").value = "";
    show_form_error("");
    show_category_error("");
    toggle_category_panel(false);
    set_category_value("");

    if (preview_url) {
        URL.revokeObjectURL(preview_url);
        preview_url = null;
    }

    document.getElementById("productModalTitle").textContent = product ? "Edit product" : "Add product";
    document.getElementById("productModalSub").textContent = product
        ? `Product #${product.id}`
        : "Fill in the details below.";
    document.getElementById("save-product-btn").textContent = product ? "Save changes" : "Create product";
    document.getElementById("image-hint").textContent = product
        ? "Leave empty to keep the current image."
        : "Optional. A default image is used if you skip it.";

    if (product) {
        document.getElementById("field-name").value = product.name ?? "";
        document.getElementById("field-description").value = product.description ?? "";
        document.getElementById("field-price").value = product.unit_price ?? "";
        document.getElementById("field-stocks").value = product.stocks ?? "";
        set_category_value(product.category_id);
        set_preview(image_url(product.image_path));
    } else {
        set_preview("");
    }

    const button = document.getElementById("save-product-btn");
    button.disabled = false;

    product_modal.show();
}

function validate_form() {
    const name = document.getElementById("field-name").value.trim();
    const price = document.getElementById("field-price").value;
    const stocks = document.getElementById("field-stocks").value;
    const category = get_category_value();

    if (!name) return "Please enter a product name.";
    if (!category) return "Please choose a category.";
    if (price === "" || Number(price) <= 0) return "Price must be more than 0.";
    if (stocks === "" || !Number.isInteger(Number(stocks)) || Number(stocks) < 0) {
        return "Stocks must be a whole number, 0 or more.";
    }

    return "";
}

async function handle_submit(event) {
    event.preventDefault();

    const problem = validate_form();

    if (problem) {
        show_form_error(problem);
        return;
    }

    const is_edit = editing_product !== null;
    const form_data = new FormData();

    if (is_edit) {
        form_data.append("id", editing_product.id);
    }

    form_data.append("category_id", get_category_value());
    form_data.append("name", document.getElementById("field-name").value.trim());
    form_data.append("description", document.getElementById("field-description").value.trim());
    form_data.append("unit_price", document.getElementById("field-price").value);
    form_data.append("stocks", document.getElementById("field-stocks").value);

    const file = document.getElementById("field-image").files[0];

    if (file) {
        form_data.append("image", file);
    }

    const button = document.getElementById("save-product-btn");

    button.disabled = true;
    button.textContent = "Saving…";
    show_form_error("");

    try {
        await save_product(form_data, is_edit);

        product_modal.hide();
        await load_products();
    } catch (error) {
        console.error("Error saving product:", error);

        button.disabled = false;
        button.textContent = is_edit ? "Save changes" : "Create product";
        show_form_error(error.message && !error.message.startsWith("Request failed")
            ? error.message
            : "Couldn't save the product. The name may already be used by another product.");
    }
}

/* ---------------- Delete popup ---------------- */

function open_delete(product) {
    deleting_product = product;

    document.getElementById("delete-text").textContent =
        `“${product.name}” will be removed from the catalog and from customers' carts. Past orders keep their details. This can't be undone.`;
    document.getElementById("delete-error").classList.add("d-none");

    const button = document.getElementById("confirm-delete-btn");
    button.disabled = false;
    button.textContent = "Delete";

    delete_modal.show();
}

async function handle_delete() {
    if (!deleting_product) {
        return;
    }

    const button = document.getElementById("confirm-delete-btn");
    const box = document.getElementById("delete-error");

    button.disabled = true;
    button.textContent = "Deleting…";
    box.classList.add("d-none");

    try {
        await delete_product(deleting_product.id);

        delete_modal.hide();
        await load_products();
    } catch (error) {
        console.error("Error deleting product:", error);

        button.disabled = false;
        button.textContent = "Delete";
        box.querySelector("span").textContent =
            "Couldn't delete this product. Please try again.";
        box.classList.remove("d-none");
    }
}

/* ---------------- Events ---------------- */

window.addEventListener("DOMContentLoaded", async () => {
    product_modal = new bootstrap.Modal(document.getElementById("productModal"));
    delete_modal = new bootstrap.Modal(document.getElementById("deleteModal"));

    document.getElementById("add-product-btn").addEventListener("click", () => open_form());
    document.getElementById("product-form").addEventListener("submit", handle_submit);
    document.getElementById("confirm-delete-btn").addEventListener("click", handle_delete);
    document.getElementById("products-retry-btn").addEventListener("click", load_products);

    document.getElementById("category-toggle").addEventListener("click", () => toggle_category_panel());
    document.getElementById("add-category-btn").addEventListener("click", handle_add_category);
    document.getElementById("new-category-name").addEventListener("keydown", (event) => {
        // Enter adds the category instead of submitting the product form
        if (event.key === "Enter") {
            event.preventDefault();
            handle_add_category();
        }
    });

    // live preview of the picked image
    document.getElementById("field-image").addEventListener("change", (event) => {
        const file = event.target.files[0];

        if (preview_url) {
            URL.revokeObjectURL(preview_url);
            preview_url = null;
        }

        if (file) {
            preview_url = URL.createObjectURL(file);
            set_preview(preview_url);
        } else {
            set_preview(editing_product ? image_url(editing_product.image_path) : "");
        }
    });

    // Navbar search filters the list (name, description, category)
    document.getElementById("product-search").addEventListener("input", (event) => {
        search_text = event.target.value.trim().toLowerCase();
        render_products();
    });

    await load_categories();
    await load_products();
});
