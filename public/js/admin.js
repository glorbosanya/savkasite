// public/js/admin.js

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || "Ошибка запроса");
  }
  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("productForm");
  const formStatus = document.getElementById("formStatus");
  const productsList = document.getElementById("productsList");
  const resetBtn = document.getElementById("resetBtn");
  const searchInput = document.getElementById("searchInput");

  const idField = document.getElementById("productId");
  const currentImageField = document.getElementById("currentImage");

  // -------- загрузка списка товаров --------
  async function loadProducts(query = "") {
    productsList.innerHTML =
      '<div style="padding:10px;font-size:13px;color:#9ca3af">Загрузка…</div>';

    try {
      const url = query
        ? `/api/products?search=${encodeURIComponent(query)}`
        : "/api/products";

      const products = await fetchJSON(url);

      if (!products.length) {
        productsList.innerHTML =
          '<div style="padding:10px;font-size:13px;color:#9ca3af">Товаров пока нет</div>';
        return;
      }

      productsList.innerHTML = "";
      for (const p of products) {
        const item = document.createElement("div");
        item.className = "product-item";

        const thumb = document.createElement("div");
        thumb.className = "product-thumb";
        if (p.image) {
          const img = document.createElement("img");
          img.src = p.image;
          img.alt = p.name || "";
          thumb.appendChild(img);
        }

        const main = document.createElement("div");
        main.className = "product-main";
        const title = document.createElement("div");
        title.className = "product-title";
        title.textContent = p.name || "(без названия)";

        const meta = document.createElement("div");
        meta.className = "product-meta";
        meta.textContent = `Код: ${p.code || "-"} · ${
          p.price || 0
        } ₽ · Кол-во: ${p.quantity || 0}`;

        const badge = document.createElement("span");
        badge.className =
          "badge " + (p.status === "out_of_stock" ? "out" : "");
        badge.textContent =
          p.status === "expected"
            ? "Ожидается"
            : p.status === "out_of_stock"
            ? "Нет в наличии"
            : "В наличии";

        meta.appendChild(badge);

        main.appendChild(title);
        main.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "product-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn btn-outline";
        editBtn.textContent = "Редактировать";
        editBtn.addEventListener("click", () => fillFormFromProduct(p));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn btn-outline";
        delBtn.style.color = "#fecaca";
        delBtn.textContent = "Удалить";
        delBtn.addEventListener("click", () => deleteProduct(p.id));

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        item.appendChild(thumb);
        item.appendChild(main);
        item.appendChild(actions);

        productsList.appendChild(item);
      }
    } catch (err) {
      console.error(err);
      productsList.innerHTML =
        '<div style="padding:10px;font-size:13px;color:#fecaca">Ошибка загрузки товаров</div>';
    }
  }

  // -------- заполнить форму данными товара --------
  function fillFormFromProduct(p) {
    idField.value = p.id;
    document.getElementById("name").value = p.name || "";
    document.getElementById("code").value = p.code || "";
    document.getElementById("category").value = p.category || "";
    document.getElementById("price").value = p.price || 0;
    document.getElementById("quantity").value = p.quantity || 0;
    document.getElementById("status").value = p.status || "in_stock";
    document.getElementById("description").value = p.description || "";
    currentImageField.value = p.image || "";
    formStatus.textContent = "Режим редактирования товара #" + p.id;
  }

  // -------- очистка формы --------
  function resetForm() {
    form.reset();
    idField.value = "";
    currentImageField.value = "";
    formStatus.textContent = "";
  }

  resetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetForm();
  });

  // -------- отправка формы --------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    formStatus.style.color = "#a5b4fc";
    formStatus.textContent = "Отправка…";

    try {
      const formData = new FormData(form);
      const id = idField.value.trim();

      let url = "/api/products";
      let method = "POST";

      if (id) {
        url = `/api/products/${id}`;
        method = "PUT";
      }

      console.log("Отправка на", url, "метод", method);

      const res = await fetch(url, {
        method,
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      console.log("Ответ сервера:", data);

      if (!res.ok || data.error) {
        throw new Error(data.error || "Ошибка сохранения товара");
      }

      formStatus.style.color = "#bbf7d0";
      formStatus.textContent = id
        ? "Товар обновлён"
        : "Товар добавлен (ID: " + data.id + ")";

      resetForm();
      await loadProducts(searchInput.value.trim());
    } catch (err) {
      console.error(err);
      formStatus.style.color = "#fecaca";
      formStatus.textContent = err.message || "Ошибка сохранения товара";
    }
  });

  // -------- удалить товар --------
  async function deleteProduct(id) {
    if (!confirm("Удалить товар #" + id + "?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => ({}));
      console.log("Удаление:", data);
      await loadProducts(searchInput.value.trim());
    } catch (err) {
      console.error(err);
      alert("Ошибка удаления");
    }
  }

  // -------- поиск --------
  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      loadProducts(searchInput.value.trim());
    }, 300);
  });

  // первая загрузка
  loadProducts();
});
