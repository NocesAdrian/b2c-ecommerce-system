const admin_context = new URLSearchParams(window.location.search).get("from") === "admin";

if (admin_context) {
    for (const link of document.querySelectorAll("[data-role-dashboard-link]")) {
        link.href = "admin.html";
        const label = link.querySelector("span");
        if (label) {
            label.textContent = "Dashboard";
        } else {
            link.textContent = "Dashboard";
        }
    }

    for (const link of document.querySelectorAll("[data-role-chat-link]")) {
        link.href = "customer-service.html?from=admin";
    }

    for (const link of document.querySelectorAll("[data-role-about-link]")) {
        link.href = "about.html?from=admin";
    }

    for (const link of document.querySelectorAll("[data-role-home-link]")) {
        link.href = "admin.html";
    }

    const shortcut = document.getElementById("about-shortcut-link")
        || document.getElementById("service-shortcut-link");
    if (shortcut) {
        shortcut.href = "admin.html";
        shortcut.setAttribute("aria-label", "Dashboard");
        shortcut.title = "Dashboard";
        shortcut.querySelector("i")?.classList.replace("bi-shop", "bi-shop-window");
    }

    const role = document.getElementById("about-role") || document.getElementById("service-role");
    if (role) {
        role.textContent = "Admin";
    }
}
