// UI only: renders the checkout preview from a list of cart items.
// Replace `cartItems` with your real cart data later. Each item needs:
// { name, price, quantity, image }

const cartItems = [
  { name: "Signal Tote",       price: 450, quantity: 2, image: "" },
  { name: "Static Mug",        price: 380, quantity: 1, image: "" },
  { name: "Wired Notebook",    price: 320, quantity: 3, image: "" },
  { name: "Ambient Vinyl Art", price: 780, quantity: 1, image: "" }
];

const peso = (n) => "₱" + n.toLocaleString("en-PH");

const list = document.getElementById("checkoutItems");
const template = document.getElementById("checkout-item-template");
const payBtn = document.getElementById("payBtn");

function render(items) {
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = '<li class="items-empty"><i class="bi bi-bag"></i>Your cart is empty.</li>';
    payBtn.disabled = true;
  }

  let count = 0;
  let total = 0;

  items.forEach((item) => {
    const row = template.content.cloneNode(true);
    const img = row.querySelector("img");

    if (item.image) {
      img.src = item.image;
      img.alt = item.name;
    } else {
      img.remove(); // no photo yet: the soft placeholder block stays
    }

    row.querySelector(".co-name").textContent = item.name;
    row.querySelector(".co-qty-value").textContent = "× " + item.quantity;
    row.querySelector(".co-total").textContent = peso(item.price * item.quantity);
    list.appendChild(row);

    count += item.quantity;
    total += item.price * item.quantity;
  });

  document.getElementById("summaryCount").textContent = count;
  document.getElementById("summaryTotal").textContent = peso(total);
}

render(cartItems);

// Confirm checkout and pay (visual feedback only)
payBtn.addEventListener("click", () => {
  payBtn.disabled = true;
  payBtn.classList.add("done");
  payBtn.innerHTML = '<i class="bi bi-check2 me-2"></i><span>Order confirmed</span>';
});

// Keep the search UI-only
document.querySelectorAll("form[data-ui-only]").forEach((f) => {
  f.addEventListener("submit", (e) => e.preventDefault());
});
