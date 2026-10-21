// UI only: quantity controller and add-to-cart feedback

const product = document.getElementById("product");
const price = Number(product.dataset.price);
const stock = Number(product.dataset.stock);

const qty = document.getElementById("qty");
const minus = document.getElementById("qtyMinus");
const plus = document.getElementById("qtyPlus");
const subtotal = document.getElementById("subtotal");
const hint = document.getElementById("qtyHint");
const addBtn = document.getElementById("addBtn");

const peso = (n) => "₱" + n.toLocaleString("en-PH");

function setQty(value) {
  let v = parseInt(value, 10);
  if (isNaN(v) || v < 1) v = 1;
  if (v > stock) v = stock;
  qty.value = v;

  minus.disabled = v <= 1;
  plus.disabled = v >= stock;
  subtotal.textContent = peso(v * price);
  hint.textContent = v >= stock ? "You've reached the available stock." : "";
}

if (stock <= 0) {
  // Out of stock
  qty.value = 0;
  qty.disabled = true;
  minus.disabled = true;
  plus.disabled = true;
  subtotal.textContent = peso(0);
  hint.textContent = "This item is currently out of stock.";
  addBtn.disabled = true;
  addBtn.querySelector("span").textContent = "Out of stock";
} else {
  qty.max = stock;
  setQty(qty.value);

  minus.addEventListener("click", () => setQty(Number(qty.value) - 1));
  plus.addEventListener("click", () => setQty(Number(qty.value) + 1));
  qty.addEventListener("input", () => { if (qty.value !== "") setQty(qty.value); });
  qty.addEventListener("blur", () => setQty(qty.value));

  // Add to cart (visual feedback only)
  let timer;
  addBtn.addEventListener("click", () => {
    const n = Number(qty.value);
    addBtn.classList.add("added");
    addBtn.innerHTML = '<i class="bi bi-check2 me-2"></i><span>' + n + (n > 1 ? " items" : " item") + " added to cart</span>";
    clearTimeout(timer);
    timer = setTimeout(() => {
      addBtn.classList.remove("added");
      addBtn.innerHTML = '<i class="bi bi-bag-plus me-2"></i><span>Add to cart</span>';
    }, 1800);
  });
}
