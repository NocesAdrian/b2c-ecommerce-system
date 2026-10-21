// UI only: keep the search form from submitting anywhere
document.querySelectorAll("form[data-ui-only]").forEach((form) => {
  form.addEventListener("submit", (e) => e.preventDefault());
});
