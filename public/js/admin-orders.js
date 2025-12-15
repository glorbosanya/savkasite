// public/js/admin-orders.js

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || "Ошибка запроса");
  }
  return data;
}

async function loadOrders() {
  const list = document.getElementById("ordersList");
  const errorBox = document.getElementById("errorBox");
  const status = document.getElementById("status");
  const searchInput = document.getElementById("searchInput");

  errorBox.textContent = "";
  status.textContent = "Загрузка…";
  list.innerHTML = "";

  try:
    // забираем все заказы
    const orders = await fetchJSON("/api/orders");
    let filtered = orders;

    const q = (searchInput.value || "").trim().toLowerCase();
    if (q) {
      filtered = orders.filter((o) => {
        return (
          (o.phone && o.phone.toLowerCase().includes(q)) ||
          (o.name && o.name.toLowerCase().includes(q))
        );
      });
    }

    status.textContent = `Показано ${filtered.length} из ${orders.length}`;

    if (!filtered.length) {
      list.innerHTML =
        '<div class="empty">Заказов пока нет</div>';
      return;
    }

    for (const o of filtered) {
      const card = document.createElement("div");
      card.className = "order-card";

      const head = document.createElement("div");
      head.className = "order-head";

      const title = document.createElement("div");
      title.className = "order-title";
      title.textContent = `Заказ #${o.id} · ${o.phone || "телефон не указан"}`;

      const badge = document.createElement("div");
      badge.className = "badge";
      const date = o.createdAt ? new Date(o.createdAt) : null;
      badge.textContent = date
        ? date.toLocaleString("ru-RU")
        : "дата неизвестна";

      head.appendChild(title);
      head.appendChild(badge);

      const meta = document.createElement("div");
      meta.className = "order-meta";
      meta.textContent =
        (o.name ? `Клиент: ${o.name}` : "Имя не указано") +
        (o.city ? ` · Город: ${o.city}` : "");

      const comment = document.createElement("div");
      comment.className = "order-comment";
      if (o.comment) {
        comment.textContent = "Комментарий: " + o.comment;
      } else {
        comment.textContent = "Комментарий: —";
        comment.style.color = "#6b7280";
      }

      const table = document.createElement("table");
      table.className = "items-table";

      const thead = document.createElement("thead");
      thead.innerHTML =
        "<tr><th>Товар</th><th>Код</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr>";
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      (o.items || []).forEach((it) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${it.name || "(без названия)"}</td>
          <td>${it.code || "-"}</td>
          <td>${it.qty || 0}</td>
          <td>${(it.price || 0).toLocaleString("ru-RU")} ₽</td>
          <td>${(it.lineTotal || 0).toLocaleString("ru-RU")} ₽</td>
        `;
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);

      const total = document.createElement("div");
      total.className = "total";
      total.textContent =
        "Итого по заказу: " +
        (o.totalPrice || 0).toLocaleString("ru-RU") +
        " ₽";

      card.appendChild(head);
      card.appendChild(meta);
      card.appendChild(comment);
      card.appendChild(table);
      card.appendChild(total);

      list.appendChild(card);
    }
  } catch (err) {
    console.error(err);
    errorBox.textContent = err.message || "Ошибка загрузки заказов";
    status.textContent = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => {
      loadOrders();
    }, 300);
  });

  loadOrders();
});
