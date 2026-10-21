// UI only: show / hide password
document.querySelectorAll("[data-toggle-password]").forEach((toggle) => {
  toggle.addEventListener("change", () => {
    const input = document.getElementById(toggle.dataset.togglePassword);
    if (input) input.type = toggle.checked ? "text" : "password";
  });
});

// UI only: keep the demo forms from submitting anywhere
document.querySelectorAll("form[data-ui-only]").forEach((form) => {
  form.addEventListener("submit", (e) => e.preventDefault());
});
