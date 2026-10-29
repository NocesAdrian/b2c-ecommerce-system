import { get_config } from "../config.js";

const config = get_config();

const api_endpoint = {
    users: `${config.api_src}/api/users`,
    user_create: `${config.api_src}/api/users/create`,
    user_update: `${config.api_src}/api/users/update`,
    user_delete: `${config.api_src}/api/users/delete`,
    current_user: `${config.api_src}/api/users/user`
};

const role_customer = 2;
const role_admin = 1;

let all_users = [];
let current_user_id = null;
let active_filter = "all";
let search_text = "";
let editing_user = null;   // null = adding a new user
let deleting_user = null;
let user_modal = null;
let delete_modal = null;

function role_of(user) {
    if (Number(user.role_id) === role_admin) return "admin";
    if (Number(user.role_id) === role_customer) return "customer";
    return "none";
}

function format_date(date_text) {
    const date = new Date(String(date_text).replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function is_me(user) {
    return current_user_id !== null && Number(user.id) === Number(current_user_id);
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

async function get_users() {
    const data = await request(api_endpoint.users, { method: "GET" });

    // accepts [..] or { users: [..] }
    return Array.isArray(data) ? data : (data.users || []);
}

async function get_current_user_id() {
    try {
        const data = await request(api_endpoint.current_user, { method: "GET" });

        return data.user_id ?? null;
    } catch (error) {
        return null;
    }
}

async function send_json(url, body) {
    return await request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

/* ---------------- List ---------------- */

function matches(user) {
    if (active_filter !== "all" && role_of(user) !== active_filter) {
        return false;
    }

    if (!search_text) {
        return true;
    }

    return [user.username, `#${user.id}`, role_of(user)].join(" ").toLowerCase().includes(search_text);
}

function show_state(icon, title, text, show_retry = false) {
    document.getElementById("users-state-icon").className = `bi ${icon}`;
    document.getElementById("users-state-title").textContent = title;
    document.getElementById("users-state-text").textContent = text;
    document.getElementById("users-retry-btn").classList.toggle("d-none", !show_retry);
    document.getElementById("users-state").classList.remove("d-none");
}

function update_counts() {
    document.querySelectorAll(".filter-chip").forEach(chip => {
        const name = chip.dataset.filter;
        const count = name === "all"
            ? all_users.length
            : all_users.filter(user => role_of(user) === name).length;

        chip.querySelector(".chip-count").textContent = count;
    });
}

function set_role_pill(pill, role) {
    const icon = pill.querySelector("i");
    const text = pill.querySelector(".role-text");

    pill.classList.remove("pill-solid", "pill-muted");

    if (role === "admin") {
        pill.classList.add("pill-solid");
        icon.className = "bi bi-shield-check";
        text.textContent = "Admin";
    } else if (role === "customer") {
        icon.className = "bi bi-person";
        text.textContent = "Customer";
    } else {
        pill.classList.add("pill-muted");
        icon.className = "bi bi-question-circle";
        text.textContent = "No role";
    }
}

function render_users() {
    const container = document.getElementById("user-list");
    const template = document.getElementById("user-card-template");

    container.innerHTML = "";
    document.getElementById("users-state").classList.add("d-none");

    update_counts();

    const shown = all_users
        .filter(matches)
        .sort((a, b) => Number(b.id) - Number(a.id));

    document.getElementById("users-summary").textContent =
        `${shown.length} of ${all_users.length} ${all_users.length === 1 ? "user" : "users"}`;

    if (shown.length === 0) {
        if (all_users.length === 0) {
            show_state("bi-people", "No users yet", "Tap “Add user” to create the first account.");
        } else {
            show_state("bi-search", "No matching users", "Try another filter or search.");
        }
        return;
    }

    shown.forEach(user => {
        const clone = template.content.cloneNode(true);
        const me = is_me(user);

        clone.querySelector(".user-row-name").textContent = me ? `${user.username} (you)` : user.username;
        clone.querySelector(".user-row-meta").textContent =
            `#${user.id} · Joined ${format_date(user.date_created)}`;

        set_role_pill(clone.querySelector(".user-role-pill"), role_of(user));

        clone.querySelector(".edit-btn").addEventListener("click", () => open_form(user));

        const delete_btn = clone.querySelector(".delete-btn");

        if (me) {
            delete_btn.disabled = true;
            delete_btn.title = "You can't delete your own account";
        } else {
            delete_btn.addEventListener("click", () => open_delete(user));
        }

        container.appendChild(clone);
    });
}

async function load_users() {
    document.getElementById("users-summary").textContent = "Loading users…";

    try {
        all_users = await get_users();
        render_users();
    } catch (error) {
        console.error("Error loading users:", error);

        document.getElementById("user-list").innerHTML = "";
        document.getElementById("users-summary").textContent = "";
        show_state(
            "bi-wifi-off",
            error.status === 403 ? "Admins only" : "Couldn't load users",
            error.status === 403 ? "Only admins can see users." : "Please check your connection and try again.",
            error.status !== 403
        );
    }
}

/* ---------------- Add / edit popup ---------------- */

function show_form_error(message) {
    const box = document.getElementById("user-form-error");

    box.querySelector("span").textContent = message;
    box.classList.toggle("d-none", !message);
}

function set_password_visible(visible) {
    document.getElementById("field-password").type = visible ? "text" : "password";
    document.getElementById("password-toggle").innerHTML = `<i class="bi ${visible ? "bi-eye-slash" : "bi-eye"}"></i>`;
    document.getElementById("password-toggle").setAttribute("aria-label", visible ? "Hide password" : "Show password");
}

function open_form(user = null) {
    editing_user = user;

    document.getElementById("user-form").reset();
    show_form_error("");
    set_password_visible(false);

    const is_edit = user !== null;

    document.getElementById("userModalTitle").textContent = is_edit ? "Edit user" : "Add user";
    document.getElementById("userModalSub").textContent = is_edit
        ? `User #${user.id}`
        : "New accounts start as customers. You can make them admins afterwards.";
    document.getElementById("save-user-btn").textContent = is_edit ? "Save changes" : "Create user";
    document.getElementById("save-user-btn").disabled = false;

    // the role can only be changed when editing (and never for yourself)
    document.getElementById("role-field").classList.toggle("d-none", !is_edit);
    document.getElementById("field-role").disabled = is_edit && is_me(user);

    document.getElementById("password-label").textContent = is_edit ? "New password" : "Password";
    document.getElementById("password-hint").classList.toggle("d-none", !is_edit);
    document.getElementById("field-password").autocomplete = "new-password";

    if (is_edit) {
        document.getElementById("field-username").value = user.username ?? "";
        document.getElementById("field-role").value = String(user.role_id ?? role_customer);
    }

    user_modal.show();
}

async function handle_submit(event) {
    event.preventDefault();

    const username = document.getElementById("field-username").value.trim();
    const password = document.getElementById("field-password").value;
    const is_edit = editing_user !== null;

    if (!username) {
        show_form_error("Please enter a username.");
        return;
    }

    if (is_edit && (username.length < 4 || username.length > 255)) {
        show_form_error("Username must contain between 4 and 255 characters.");
        return;
    }

    if (!is_edit && !password) {
        show_form_error("Please enter a password.");
        return;
    }

    const button = document.getElementById("save-user-btn");

    button.disabled = true;
    button.textContent = "Saving…";
    show_form_error("");

    try {
        if (is_edit) {
            const body = {
                id: editing_user.id,
                username,
                role_id: Number(document.getElementById("field-role").value)
            };

            if (password) {
                body.password = password;
            }

            await send_json(api_endpoint.user_update, body);
        } else {
            await send_json(api_endpoint.user_create, { username, password });
        }

        user_modal.hide();
        await load_users();
    } catch (error) {
        console.error("Error saving user:", error);

        button.disabled = false;
        button.textContent = is_edit ? "Save changes" : "Create user";

        if (error.status === 409) {
            show_form_error(error.message && !error.message.startsWith("Request failed")
                ? (error.message === "User exist" ? "That username is already taken." : error.message)
                : "That username is already taken.");
        } else {
            show_form_error(error.message && !error.message.startsWith("Request failed")
                ? error.message
                : "Couldn't save the user. Please check the details and try again.");
        }
    }
}

/* ---------------- Delete popup ---------------- */

function open_delete(user) {
    deleting_user = user;

    document.getElementById("delete-user-text").textContent =
        `“${user.username}” will lose access, and their cart and delivery location are removed. Their past orders stay in your records. This can't be undone.`;
    document.getElementById("delete-user-error").classList.add("d-none");

    const button = document.getElementById("confirm-delete-user-btn");
    button.disabled = false;
    button.textContent = "Delete";

    delete_modal.show();
}

async function handle_delete() {
    if (!deleting_user) {
        return;
    }

    const button = document.getElementById("confirm-delete-user-btn");
    const box = document.getElementById("delete-user-error");

    button.disabled = true;
    button.textContent = "Deleting…";
    box.classList.add("d-none");

    try {
        await send_json(api_endpoint.user_delete, { id: deleting_user.id });

        delete_modal.hide();
        await load_users();
    } catch (error) {
        console.error("Error deleting user:", error);

        button.disabled = false;
        button.textContent = "Delete";
        box.querySelector("span").textContent = error.message && !error.message.startsWith("Request failed")
            ? error.message
            : "Couldn't delete this user. Please try again.";
        box.classList.remove("d-none");
    }
}

/* ---------------- Events ---------------- */

window.addEventListener("DOMContentLoaded", async () => {
    user_modal = new bootstrap.Modal(document.getElementById("userModal"));
    delete_modal = new bootstrap.Modal(document.getElementById("deleteUserModal"));

    document.getElementById("add-user-btn").addEventListener("click", () => open_form());
    document.getElementById("user-form").addEventListener("submit", handle_submit);
    document.getElementById("confirm-delete-user-btn").addEventListener("click", handle_delete);
    document.getElementById("users-retry-btn").addEventListener("click", load_users);

    document.getElementById("password-toggle").addEventListener("click", () => {
        set_password_visible(document.getElementById("field-password").type === "password");
    });

    document.getElementById("user-filters").addEventListener("click", (event) => {
        const chip = event.target.closest(".filter-chip");

        if (!chip) {
            return;
        }

        active_filter = chip.dataset.filter;

        document.querySelectorAll(".filter-chip").forEach(other => {
            const is_active = other === chip;

            other.classList.toggle("is-active", is_active);
            other.setAttribute("aria-selected", String(is_active));
        });

        render_users();
    });

    // Navbar search filters the list (username, id, role)
    document.getElementById("user-search").addEventListener("input", (event) => {
        search_text = event.target.value.trim().toLowerCase();
        render_users();
    });

    current_user_id = await get_current_user_id();
    await load_users();
});
