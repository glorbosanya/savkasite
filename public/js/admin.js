async function apiGetProducts() {
  const res = await fetch('/api/products');
  return await res.json();
}

async function apiUploadImage(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    alert('Ошибка загрузки изображения');
    return null;
  }
  const data = await res.json();
  return data.filename;
}

async function apiCreateProduct(payload) {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    alert('Ошибка создания товара (возможно, не авторизован)');
    return null;
  }
  return await res.json();
}

async function apiUpdateProduct(id, payload) {
  const res = await fetch('/api/products/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    alert('Ошибка обновления товара');
    return null;
  }
  return await res.json();
}

async function apiDeleteProduct(id) {
  const res = await fetch('/api/products/' + id, {
    method: 'DELETE'
  });
  if (!res.ok) {
    alert('Ошибка удаления');
    return null;
  }
  return await res.json();
}

// --- Рендер списка ---------------------------------------------------------
let allProducts = [];

function renderProductList(filterText = '') {
  const listEl = document.getElementById('admin-product-list');
  listEl.innerHTML = '';

  const norm = filterText.trim().toLowerCase();
  const products = allProducts.filter(p => {
    if (!norm) return true;
    return (
      (p.name || '').toLowerCase().includes(norm) ||
      (p.code || '').toLowerCase().includes(norm)
    );
  });

  if (products.length === 0) {
    listEl.innerHTML = '<p class="eks-muted">Товаров не найдено.</p>';
    return;
  }

  products.forEach(p => {
    const row = document.createElement('div');
    row.className = 'product-row';

    const statusText = p.status === 'in_stock' ? 'В наличии' : 'Ожидается';

    row.innerHTML = `
      <div class="row-main">
        <strong>${p.name}</strong>
        <div class="eks-muted small">Код: ${p.code || '-'}</div>
        <div class="eks-muted small">Категория: ${p.category || '-'}</div>
        <div class="eks-muted small">${p.price || 0} ₽ — ${statusText}</div>
      </div>
      <div class="row-buttons">
        <button class="btn-small" data-id="${p.id}" data-action="edit">Редактировать</button>
        <button class="btn-small btn-red" data-id="${p.id}" data-action="delete">Удалить</button>
      </div>
    `;

    listEl.appendChild(row);
  });
}

// --- Загрузка списка -------------------------------------------------------
async function reloadProducts() {
  allProducts = await apiGetProducts();
  renderProductList(document.getElementById('admin-search').value);
}

// --- Добавление товара -----------------------------------------------------
document.getElementById('add-btn').addEventListener('click', async () => {
  const name = document.getElementById('add-name').value.trim();
  const code = document.getElementById('add-code').value.trim();
  const description = document.getElementById('add-desc').value.trim();
  const price = Number(document.getElementById('add-price').value || 0);
  const category = document.getElementById('add-category').value;
  const status = document.getElementById('add-status').value;
  const imageFile = document.getElementById('add-image').files[0];

  let imageName = null;
  if (imageFile) {
    imageName = await apiUploadImage(imageFile);
    if (!imageName) return;
  }

  const payload = { name, code, description, price, category, status, image: imageName };
  const created = await apiCreateProduct(payload);
  if (created) {
    alert('Товар добавлен');
    // очистить форму
    document.getElementById('add-name').value = '';
    document.getElementById('add-code').value = '';
    document.getElementById('add-desc').value = '';
    document.getElementById('add-price').value = '';
    document.getElementById('add-image').value = '';
    reloadProducts();
  }
});

// --- Обработчик списка (edit/delete) ---------------------------------------
document.getElementById('admin-product-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  const product = allProducts.find(p => String(p.id) === String(id));
  if (!product) return;

  if (action === 'delete') {
    if (!confirm('Удалить товар "' + product.name + '"?')) return;
    const res = await apiDeleteProduct(id);
    if (res) reloadProducts();
  }

  if (action === 'edit') {
    openEditForm(product);
  }
});

// --- Форма редактирования ---------------------------------------------------
function openEditForm(product) {
  const panel = document.getElementById('edit-panel');
  panel.style.display = 'block';

  document.getElementById('edit-id').value = product.id;
  document.getElementById('edit-name').value = product.name || '';
  document.getElementById('edit-code').value = product.code || '';
  document.getElementById('edit-desc').value = product.description || '';
  document.getElementById('edit-price').value = product.price || '';
  document.getElementById('edit-category').value = product.category || 'аксессуары';
  document.getElementById('edit-status').value = product.status || 'in_stock';

  const preview = document.getElementById('edit-preview');
  if (product.image) {
    preview.src = '/uploads/' + product.image;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
  document.getElementById('edit-image').value = '';
}

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  document.getElementById('edit-panel').style.display = 'none';
});

document.getElementById('save-edit-btn').addEventListener('click', async () => {
  const id = document.getElementById('edit-id').value;
  if (!id) return;

  const name = document.getElementById('edit-name').value.trim();
  const code = document.getElementById('edit-code').value.trim();
  const description = document.getElementById('edit-desc').value.trim();
  const price = Number(document.getElementById('edit-price').value || 0);
  const category = document.getElementById('edit-category').value;
  const status = document.getElementById('edit-status').value;

  let product = allProducts.find(p => String(p.id) === String(id));
  let imageName = product ? product.image : null;

  const newFile = document.getElementById('edit-image').files[0];
  if (newFile) {
    const uploaded = await apiUploadImage(newFile);
    if (!uploaded) return;
    imageName = uploaded;
  }

  const payload = { name, code, description, price, category, status, image: imageName };
  const res = await apiUpdateProduct(id, payload);
  if (res) {
    alert('Сохранено');
    document.getElementById('edit-panel').style.display = 'none';
    reloadProducts();
  }
});

// --- Фильтр в админке -------------------------------------------------------
document.getElementById('admin-search').addEventListener('input', (e) => {
  renderProductList(e.target.value);
});

// --- Logout -----------------------------------------------------------------
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

// --- Init -------------------------------------------------------------------
reloadProducts();
