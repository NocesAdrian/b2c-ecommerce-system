export function initQuantityController() {
    const product = document.getElementById("product");
    const price = Number(product.dataset.price);
    const stock = Number(product.dataset.stock);

    const qty = document.getElementById("qty");
    const minus = document.getElementById("qtyMinus");
    const plus = document.getElementById("qtyPlus");
    const subtotal = document.getElementById("subtotal");
    const hint = document.getElementById("qtyHint");
    const addBtn = document.getElementById("addBtn");

    const peso = n => "₱" + n.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    function setQty(value) {
        let v = parseInt(value, 10);

        if (isNaN(v) || v < 1) v = 1;
        if (v > stock) v = stock;

        qty.value = v;
        minus.disabled = v <= 1;
        plus.disabled = v >= stock;
        subtotal.textContent = peso(v * price);
        hint.textContent = v >= stock
            ? "You've reached the available stock."
            : "";
    }

    if (stock <= 0) {
        qty.value = 0;
        qty.disabled = true;
        minus.disabled = true;
        plus.disabled = true;
        subtotal.textContent = peso(0);
        hint.textContent = "This item is currently out of stock.";
        addBtn.disabled = true;
        addBtn.querySelector("span").textContent = "Out of stock";
        return;
    }

    qty.max = stock;
    addBtn.disabled = false;
    setQty(qty.value);

    minus.addEventListener("click", () => setQty(Number(qty.value) - 1));
    plus.addEventListener("click", () => setQty(Number(qty.value) + 1));
    qty.addEventListener("input", () => {
        if (qty.value !== "") setQty(qty.value);
    });
    qty.addEventListener("blur", () => setQty(qty.value));

}