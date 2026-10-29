import { get_config } from "../config.js";

const config = get_config();
const endpoints = {
    conversation: `${config.api_src}/api/customer-service/conversation`,
    updates: `${config.api_src}/api/customer-service/updates`
};

const messages_element = document.getElementById("chat-messages");
const updates_element = document.getElementById("service-updates");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const send_button = document.getElementById("chat-send");
const error_element = document.getElementById("chat-error");
const input_note = document.getElementById("chat-input-note");
let send_in_progress = false;
let conversation_loaded = false;
let cooldown_until = 0;
let cooldown_interval;

function sync_chat_viewport() {
    const viewport = window.visualViewport;
    if (!viewport) return;
    document.documentElement.style.setProperty(
        "--chat-viewport-height",
        `${viewport.height + viewport.offsetTop}px`
    );
}

sync_chat_viewport();
window.addEventListener("resize", sync_chat_viewport);
window.visualViewport?.addEventListener("resize", sync_chat_viewport);
window.visualViewport?.addEventListener("scroll", sync_chat_viewport);

function update_send_controls() {
    const disabled = send_in_progress || !conversation_loaded || Date.now() < cooldown_until;
    send_button.disabled = disabled;
    input.disabled = disabled;
}

function update_cooldown(seconds) {
    const duration = Number.isFinite(seconds) ? Math.max(0, seconds) : 60;
    cooldown_until = Date.now() + duration * 1000;
    clearInterval(cooldown_interval);

    const update_note = () => {
        const remaining = Math.ceil((cooldown_until - Date.now()) / 1000);
        if (remaining <= 0) {
            clearInterval(cooldown_interval);
            cooldown_interval = undefined;
            input_note.textContent = "Up to 2,000 characters per message. The store AI is shared; allow up to one minute between requests.";
            update_send_controls();
            return;
        }

        input_note.textContent = `Chat is on cooldown. You can send another message in ${remaining} second${remaining === 1 ? "" : "s"}.`;
        update_send_controls();
    };

    update_note();
    if (duration > 0) {
        cooldown_interval = setInterval(update_note, 1000);
    }
}

function render_inline_markdown(text, parent) {
    const token_pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\([^)]+\))/g;
    let position = 0;

    for (const match of text.matchAll(token_pattern)) {
        const token = match[0];
        const start = match.index;
        parent.append(document.createTextNode(text.slice(position, start)));

        if (token.startsWith("`")) {
            const code = document.createElement("code");
            code.textContent = token.slice(1, -1);
            parent.append(code);
        } else if (token.startsWith("**") || token.startsWith("__")) {
            const strong = document.createElement("strong");
            strong.textContent = token.slice(2, -2);
            parent.append(strong);
        } else if (token.startsWith("~~")) {
            const deleted = document.createElement("del");
            deleted.textContent = token.slice(2, -2);
            parent.append(deleted);
        } else if (token.startsWith("*") || token.startsWith("_")) {
            const emphasis = document.createElement("em");
            emphasis.textContent = token.slice(1, -1);
            parent.append(emphasis);
        } else {
            const link_match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            const href = link_match?.[2];
            let safe_url;
            try {
                safe_url = new URL(href);
            } catch {
                safe_url = null;
            }

            if (link_match && safe_url && ["http:", "https:"].includes(safe_url.protocol)) {
                const link = document.createElement("a");
                link.href = safe_url.href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = link_match[1];
                parent.append(link);
            } else {
                parent.append(document.createTextNode(token));
            }
        }

        position = start + token.length;
    }

    parent.append(document.createTextNode(text.slice(position)));
}

function split_table_row(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
}

function is_table_separator(line) {
    const cells = split_table_row(line);
    return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function render_markdown_blocks(text, parent) {
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
            index += 1;
            continue;
        }

        const fence = line.match(/^\s*(```+|~~~+)\s*([\w+-]*)\s*$/);
        if (fence) {
            index += 1;
            const code_lines = [];
            while (index < lines.length && !lines[index].trimStart().startsWith(fence[1])) {
                code_lines.push(lines[index]);
                index += 1;
            }
            if (index < lines.length) index += 1;

            const pre = document.createElement("pre");
            const code = document.createElement("code");
            if (fence[2]) code.className = `language-${fence[2]}`;
            code.textContent = code_lines.join("\n");
            pre.append(code);
            parent.append(pre);
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (heading) {
            const element = document.createElement(`h${heading[1].length}`);
            render_inline_markdown(heading[2], element);
            parent.append(element);
            index += 1;
            continue;
        }

        if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) {
            parent.append(document.createElement("hr"));
            index += 1;
            continue;
        }

        if (index + 1 < lines.length && line.includes("|") && is_table_separator(lines[index + 1])) {
            const headers = split_table_row(line);
            const table = document.createElement("table");
            table.className = "chat-markdown-table";
            const thead = document.createElement("thead");
            const header_row = document.createElement("tr");
            headers.forEach(value => {
                const cell = document.createElement("th");
                render_inline_markdown(value, cell);
                header_row.append(cell);
            });
            thead.append(header_row);
            table.append(thead);

            index += 2;
            const tbody = document.createElement("tbody");
            while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
                const values = split_table_row(lines[index]);
                const row = document.createElement("tr");
                headers.forEach((_, cell_index) => {
                    const cell = document.createElement("td");
                    render_inline_markdown(values[cell_index] || "", cell);
                    row.append(cell);
                });
                tbody.append(row);
                index += 1;
            }
            table.append(tbody);
            parent.append(table);
            continue;
        }

        if (/^\s*>/.test(line)) {
            const quote_lines = [];
            while (index < lines.length && /^\s*>/.test(lines[index])) {
                quote_lines.push(lines[index].replace(/^\s*>\s?/, ""));
                index += 1;
            }
            const quote = document.createElement("blockquote");
            render_markdown_blocks(quote_lines.join("\n"), quote);
            parent.append(quote);
            continue;
        }

        const list_match = line.match(/^\s*([-+*]|\d+[.)])\s+(.+)$/);
        if (list_match) {
            const ordered = /^\d/.test(list_match[1]);
            const list = document.createElement(ordered ? "ol" : "ul");
            while (index < lines.length) {
                const item_match = lines[index].match(/^\s*([-+*]|\d+[.)])\s+(.+)$/);
                if (!item_match || /^\d/.test(item_match[1]) !== ordered) break;
                const item = document.createElement("li");
                render_inline_markdown(item_match[2], item);
                list.append(item);
                index += 1;
            }
            parent.append(list);
            continue;
        }

        const paragraph_lines = [line];
        index += 1;
        while (index < lines.length && lines[index].trim()
            && !/^\s*(?:```+|~~~+|#{1,6}\s|>|[-+*]\s|\d+[.)]\s|---+|___+|\*\*\*+)\s*$/.test(lines[index])
            && !(index + 1 < lines.length && lines[index].includes("|") && is_table_separator(lines[index + 1]))) {
            paragraph_lines.push(lines[index]);
            index += 1;
        }
        const paragraph = document.createElement("p");
        render_inline_markdown(paragraph_lines.join(" "), paragraph);
        parent.append(paragraph);
    }
}

function append_message_timestamp(bubble, message) {
    if (!message.date_created) return;

    const time = document.createElement("time");
    const date = new Date(`${message.date_created.replace(" ", "T")}Z`);
    time.dateTime = Number.isNaN(date.getTime()) ? "" : date.toISOString();
    time.textContent = Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
    bubble.append(time);
}

function render_message(message) {
    const bubble = document.createElement("article");
    bubble.className = `chat-message chat-message-${message.sender}`;

    const text = document.createElement("div");
    if (message.sender === "assistant") {
        text.className = "chat-markdown";
        render_markdown_blocks(message.message, text);
    } else {
        text.textContent = message.message;
    }
    bubble.append(text);
    append_message_timestamp(bubble, message);

    messages_element.append(bubble);
    messages_element.scrollTop = messages_element.scrollHeight;
}

function render_thinking_indicator() {
    const indicator = document.createElement("div");
    indicator.className = "chat-message chat-message-assistant chat-thinking";
    indicator.setAttribute("role", "status");
    indicator.setAttribute("aria-label", "Ain is thinking");

    const label = document.createElement("span");
    label.textContent = "Ain is thinking";
    const dots = document.createElement("span");
    dots.className = "chat-thinking-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
    indicator.append(label, dots);
    messages_element.append(indicator);
    messages_element.scrollTop = messages_element.scrollHeight;
    return indicator;
}

function render_animated_reply(message) {
    const bubble = document.createElement("article");
    bubble.className = "chat-message chat-message-assistant";
    bubble.setAttribute("aria-live", "off");
    const text = document.createElement("div");
    text.className = "chat-markdown chat-typing-text";
    text.setAttribute("aria-hidden", "true");
    bubble.append(text);
    messages_element.append(bubble);

    const words = message.message.match(/\S+\s*/gu) || [];
    const word_delay = Math.min(55, 3500 / Math.max(words.length, 1));
    let index = 0;

    return new Promise(resolve => {
        const finish_render = () => {
            text.classList.remove("chat-typing-text");
            text.replaceChildren();
            render_markdown_blocks(message.message, text);
            text.removeAttribute("aria-hidden");
            bubble.setAttribute("aria-live", "polite");
            append_message_timestamp(bubble, message);
            messages_element.scrollTop = messages_element.scrollHeight;
            resolve();
        };

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            finish_render();
            return;
        }

        const reveal_next_word = () => {
            if (index < words.length) {
                text.textContent += words[index];
                index += 1;
                messages_element.scrollTop = messages_element.scrollHeight;
                window.setTimeout(reveal_next_word, word_delay);
                return;
            }

            finish_render();
        };

        reveal_next_word();
    });
}

function render_group(title, values, format) {
    const group = document.createElement("section");
    group.className = "service-update-group";
    const heading = document.createElement("h4");
    heading.textContent = title;
    group.append(heading);

    if (values.length === 0) {
        const empty = document.createElement("p");
        empty.className = "service-muted mb-0";
        empty.textContent = "Nothing new to show.";
        group.append(empty);
        return group;
    }

    const list = document.createElement("ul");
    for (const value of values) {
        const item = document.createElement("li");
        item.textContent = format(value);
        list.append(item);
    }
    group.append(list);
    return group;
}

function render_updates(data) {
    updates_element.replaceChildren();

    if (data.role === "admin") {
        const summary = document.createElement("p");
        summary.className = "service-muted";
        summary.textContent = `${data.pending_orders} order${data.pending_orders === 1 ? "" : "s"} awaiting action.`;
        updates_element.append(summary);
        updates_element.append(render_group("Recent orders", data.recent_orders || [], order =>
            `#${order.id} · ${order.status}`
        ));
    } else {
        updates_element.append(render_group("Your orders", data.orders || [], order =>
            `#${order.id} · ${order.status} · ₱${Number(order.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
        ));
    }

    updates_element.append(render_group("New products · 7 days", data.new_products || [], product =>
        `${product.name} · ₱${Number(product.unit_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
    ));
}

async function load_conversation() {
    const response = await fetch(endpoints.conversation, { credentials: "include" });
    const body = await response.json();

    if (!response.ok) {
        throw new Error(body.error || "Couldn't load the saved conversation.");
    }

    messages_element.replaceChildren();
    if (body.messages.length === 0) {
        const status = document.createElement("p");
        status.className = "chat-status";
        status.textContent = "Hi! Ask me about your orders or the store.";
        messages_element.append(status);
    } else {
        body.messages.forEach(render_message);
    }
    conversation_loaded = true;
    update_send_controls();
}

async function load_updates() {
    const response = await fetch(endpoints.updates, { credentials: "include" });
    const body = await response.json();
    if (!response.ok) {
        throw new Error(body.error || "Couldn't load your store updates.");
    }
    render_updates(body);
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || send_button.disabled || Date.now() < cooldown_until) return;

    error_element.classList.add("d-none");
    send_in_progress = true;
    update_send_controls();
    messages_element.querySelector(".chat-status")?.remove();
    const user_message = { sender: "user", message };
    render_message(user_message);
    const status = render_thinking_indicator();

    try {
        const response = await fetch(endpoints.conversation, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });
        const body = await response.json();

        if (!response.ok) {
            if (response.status === 429) {
                const retry_after = Number(response.headers.get("Retry-After") || body.retry_after || 60);
                update_cooldown(retry_after);
            }
            throw new Error(body.error || "Couldn't send your message.");
        }

        update_cooldown(Number(body.retry_after ?? 60));
        status.remove();
        input.value = "";
        await render_animated_reply(body.message);
    } catch (error) {
        status.remove();
        messages_element.querySelector(".chat-message-user:last-of-type")?.remove();
        error_element.textContent = error.message || "Couldn't send your message. Please try again.";
        error_element.classList.remove("d-none");
    } finally {
        send_in_progress = false;
        update_send_controls();
        if (!input.disabled) input.focus();
    }
});

input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        form.requestSubmit();
    }
});

load_conversation().catch(error => {
    console.error("Failed to load customer-service conversation:", error);
    const status = document.createElement("p");
    status.className = "chat-status";
    status.textContent = error.message || "Couldn't load the saved conversation.";
    messages_element.replaceChildren(status);
    error_element.textContent = "The saved conversation couldn't be loaded. Please refresh the page before sending a message.";
    error_element.classList.remove("d-none");
});

load_updates().catch(error => {
    console.error("Failed to load customer-service updates:", error);
    const status = document.createElement("p");
    status.className = "service-muted";
    status.textContent = error.message || "Couldn't load your store updates.";
    updates_element.replaceChildren(status);
});
