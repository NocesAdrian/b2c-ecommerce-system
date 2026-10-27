import { getUserCartItems } from "../api/carts.js";

const list = document.getElementById("cartList");
const template = document.getElementById("cart-card-template");
const stateBox = document.getElementById("cartState");
const bar = document.getElementById("checkoutBar");
const barCount = document.getElementById("barCount");
const barTotal = document.getElementById("barTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH");

// Map your API's item fields here. Add or reorder names to match your database columns.
function normalize(i) {
  const price = Number(i.price ?? i.unit_price ?? 0);
  const quantity = Number(i.quantity ?? i.qty ?? 1);
  return {
    name: i.product_name ?? i.name ?? i.title ?? "Unnamed product",
    image: i.image_url ?? i.image ?? i.product_image ?? "",
    price,
    quantity,
    total: Number(i.total ?? i.subtotal ?? i.line_total ?? price * quantity)
  };
}

function showState(icon, title, text, retry = false) {
  list.innerHTML = "";
  bar.classList.add("d-none");
  stateBox.classList.remove("d-none");
  stateBox.innerHTML = `
    <i class="bi ${icon}"></i>
    <h3>${title}</h3>
    <p>${text}</p>
    ${retry
      ? '<button type="button" class="btn btn-soft" id="retryBtn">Try again</button>'
      : '<a href="customer.html" class="btn btn-d">Browse products</a>'}`;
  if (retry) document.getElementById("retryBtn").addEventListener("click", load);
}

function showLoading() {
  stateBox.classList.add("d-none");
  bar.classList.add("d-none");
  list.innerHTML = Array.from({ length: 3 }, () => `
    <div class="col-12 col-lg-6"><div class="cart-card cart-skeleton" aria-hidden="true"></div></div>`).join("");
}

function render(data) {
  const items = (data.items || []).map(normalize);

  if (!items.length) {
    showState("bi-bag", "Your cart is empty", "Add something you like and it will show up here.");
    return;
  }

  stateBox.classList.add("d-none");
  list.innerHTML = "";

  items.forEach((item) => {
    const card = template.content.cloneNode(true);
    const img = card.querySelector("img");

    if (item.image) {
      img.src = item.image;
      img.alt = item.name;
    } else {
      img.remove(); // no photo: the soft placeholder block stays
    }

    card.querySelector(".cart-name").textContent = item.name;
    card.querySelector(".cart-unit").textContent = peso(item.price) + " each";
    card.querySelector(".cart-qty-value").textContent = "× " + item.quantity;
    card.querySelector(".cart-line-total").textContent = peso(item.total);
    list.appendChild(card);
  });

  // "Number of items" = total quantity across all cards.
  // Use `items.length` instead if you want the number of different products.
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  barCount.textContent = count + (count === 1 ? " item" : " items") + " in your cart";
  barTotal.textContent = peso(data.grand_total ?? items.reduce((s, i) => s + i.total, 0));
  checkoutBtn.classList.remove("disabled");
  bar.classList.remove("d-none");
}

async function load() {
  showLoading();
  try {
    render(await getUserCartItems());
  } catch (err) {
    if (err.status === 401) {
      window.location.href = "login.html";
      return;
    }
    showState("bi-wifi-off", "Couldn't load your cart", "Check your connection and try again.", true);
  }
}

// Keep the search UI-only
document.querySelectorAll("form[data-ui-only]").forEach((f) => {
  f.addEventListener("submit", (e) => e.preventDefault());
});

load();
