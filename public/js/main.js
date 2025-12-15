// =================== Бургер и шапка =====================
const burger = document.getElementById('eks-burger');
const nav = document.getElementById('eks-nav');

if (burger && nav) {
  burger.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

const header = document.querySelector('.eks-header');
window.addEventListener('scroll', () => {
  if (!header) return;
  if (window.scrollY > 20) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
});

// =================== Лоадер =============================
const pageLoader = document.getElementById('page-loader');
if (pageLoader) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      pageLoader.classList.add('hide');
      setTimeout(() => pageLoader.remove(), 400);
    }, 350);
  });
}

// =============== 3D-ЭФФЕКТ САМОКАТА + БЕРНАУТ ===========
const scrollScooter = document.getElementById('scroll-scooter');
const scooterWrapper = document.getElementById('scooter-3d-wrapper');

if (scrollScooter && scooterWrapper) {
  scooterWrapper.addEventListener('mousemove', (e) => {
    const rect = scooterWrapper.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const rotateY = x * 18;
    const rotateX = -y * 12;

    scrollScooter.style.transform =
      `perspective(900px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
  });

  scooterWrapper.addEventListener('mouseenter', () => {
    scrollScooter.classList.add('burnout-active');
  });

  scooterWrapper.addEventListener('mouseleave', () => {
    scrollScooter.classList.remove('burnout-active');
    scrollScooter.style.transform =
      'perspective(900px) rotateY(0deg) rotateX(0deg)';
  });
}

// =================== Анимация появления карточек =========
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

// =================== ХЕЛПЕР КАРТИНОК =====================
function imgSrcFromProduct(p, fallback = '/img/scooter2.png') {
  if (!p || !p.image) return fallback;
  if (typeof p.image === 'string' && p.image.startsWith('data:')) {
    return p.image;
  }
  return '/uploads/' + p.image; // старый вариант
}

// =================== КОРЗИНА (localStorage) ==============
const CART_KEY = 'esco_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartHeaderCount();
}

function updateCartHeaderCount() {
  const badge = document.getElementById('cart-count-header');
  if (!badge) return;
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = count;
}

function addToCart(productId, qty = 1) {
  productId = Number(productId);
  let cart = getCart();
  const existing = cart.find((i) => i.id === productId);
  if (existing) existing.qty += qty;
  else cart.push({ id: productId, qty });

  saveCart(cart);
  alert('Товар добавлен в корзину');
}

// =================== КАТАЛОГ =============================
function initCatalogPage() {
  const listEl = document.getElementById('product-list');
  if (!listEl) return;

  const searchInput = document.getElementById('search');
  const categorySelect = document.getElementById('category');

  async function reload() {
    const params = new URLSearchParams();

    if (searchInput && searchInput.value.trim()) {
      params.set('search', searchInput.value.trim());
    }
    if (categorySelect && categorySelect.value) {
      params.set('category', categorySelect.value);
    }

    const res = await fetch('/api/products?' + params.toString());
    const products = await res.json();

    listEl.innerHTML = '';
    if (!products.length) {
      listEl.innerHTML = '<p class="eks-muted">Товаров не найдено.</p>';
      return;
    }

    products.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'product-card';

      const statusClass = p.status === 'in_stock' ? 'badge-in' : 'badge-await';
      const statusText = p.status === 'in_stock' ? 'В наличии' : 'Ожидается';
      const imgPath = imgSrcFromProduct(p, '/img/scooter2.png');

      card.innerHTML = `
        <a class="card-main" href="/product?id=${p.id}">
          <div class="product-thumb">
            <img src="${imgPath}" alt="${p.name}">
          </div>
          <h4>${p.name}</h4>
          <p class="product-code">Код: ${p.code || '-'}</p>
          <div class="product-bottom">
            <span class="price">${(p.price || 0).toLocaleString('ru-RU')} ₽</span>
            <span class="badge ${statusClass}">${statusText}</span>
          </div>
        </a>
        <button class="btn btn-small-full add-to-cart-btn" data-id="${p.id}">
          В корзину
        </button>
      `;
      listEl.appendChild(card);
      observer.observe(card);
    });
  }

  if (searchInput) searchInput.addEventListener('input', reload);
  if (categorySelect) categorySelect.addEventListener('change', reload);

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;
    addToCart(btn.dataset.id, 1);
  });

  reload();
}

// =================== ПОПУЛЯРНЫЕ ТОВАРЫ ===================
async function loadPopularProducts() {
  const container = document.getElementById('popular-products');
  if (!container) return;

  const res = await fetch('/api/products');
  let products = await res.json();
  products = products.slice(0, 4);

  container.innerHTML = '';
  products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const statusClass = p.status === 'in_stock' ? 'badge-in' : 'badge-await';
    const statusText = p.status === 'in_stock' ? 'В наличии' : 'Ожидается';
    const imgPath = imgSrcFromProduct(p, '/img/scooter3.png');

    card.innerHTML = `
      <a class="card-main" href="/product?id=${p.id}">
        <div class="product-thumb">
          <img src="${imgPath}" alt="${p.name}">
        </div>
        <h4>${p.name}</h4>
        <div class="product-bottom">
          <span class="price">${(p.price || 0).toLocaleString('ru-RU')} ₽</span>
          <span class="badge ${statusClass}">${statusText}</span>
        </div>
      </a>
      <button class="btn btn-small-full add-to-cart-btn" data-id="${p.id}">
        В корзину
      </button>
    `;
    container.appendChild(card);
    observer.observe(card);
  });

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;
    addToCart(btn.dataset.id, 1);
  });
}

// =================== СТРАНИЦА ТОВАРА =====================
async function loadProductDetail() {
  const detailEl = document.getElementById('product-detail');
  if (!detailEl) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    detailEl.textContent = 'Товар не найден.';
    return;
  }

  const res = await fetch('/api/products/' + id);
  if (!res.ok) {
    detailEl.textContent = 'Товар не найден или удалён.';
    return;
  }

  const p = await res.json();
  const statusClass = p.status === 'in_stock' ? 'badge-in' : 'badge-await';
  const statusText = p.status === 'in_stock' ? 'В наличии' : 'Ожидается';
  const imgPath = imgSrcFromProduct(p, '/img/scooter2.png');

  detailEl.innerHTML = `
    <div class="product-detail-card">
      <div class="product-detail-grid">
        <div class="product-detail-image">
          <img src="${imgPath}" alt="${p.name}">
        </div>
        <div class="product-detail-info">
          <h1>${p.name}</h1>
          <p class="product-code">Код товара: ${p.code || '-'}</p>
          <div class="product-detail-price">
            <span class="price">${(p.price || 0).toLocaleString('ru-RU')} ₽</span>
            <span class="badge ${statusClass}">${statusText}</span>
          </div>
          <p class="product-detail-desc">${p.description || ''}</p>
          <div class="product-detail-actions">
            <button class="btn" id="product-add-to-cart" data-id="${p.id}">
              В корзину
            </button>
            <a href="/catalog" class="btn btn-ghost">← Вернуться в каталог</a>
          </div>
          <p class="eks-muted small">
            Для заказа запчасти или уточнения наличия позвони
            <a href="tel:+79832800982">8 (983) 280-09-82</a>.
          </p>
        </div>
      </div>
    </div>
  `;

  const btn = document.getElementById('product-add-to-cart');
  if (btn) {
    btn.addEventListener('click', () => addToCart(id, 1));
  }
}

// =================== СТРАНИЦА КОРЗИНЫ ====================
function initCartPage() {
  const cartPage = document.getElementById('cart-page');
  if (!cartPage) return;

  const itemsEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');
  const summaryEl = document.getElementById('cart-summary');
  const orderSection = document.getElementById('order-form-section');
  const totalCountEl = document.getElementById('cart-total-count');
  const totalPriceEl = document.getElementById('cart-total-price');
  const orderForm = document.getElementById('order-form');

  async function renderCart() {
    let cart = getCart();
    if (!cart.length) {
      itemsEl.innerHTML = '';
      emptyEl.style.display = 'block';
      summaryEl.style.display = 'none';
      orderSection.style.display = 'none';
      return;
    }

    const productPromises = cart.map((item) =>
      fetch('/api/products/' + item.id).then((r) => r.json())
    );
    const products = await Promise.all(productPromises);

    itemsEl.innerHTML = '';
    let totalCount = 0;
    let totalPrice = 0;

    cart.forEach((item) => {
      const p = products.find((pr) => pr.id === item.id);
      if (!p) return;

      const imgPath = imgSrcFromProduct(p, '/img/scooter2.png');
      const lineTotal = (p.price || 0) * item.qty;
      totalCount += item.qty;
      totalPrice += lineTotal;

      const row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML = `
        <div class="cart-row-main">
          <img src="${imgPath}" alt="${p.name}">
          <div>
            <div class="cart-row-title">${p.name}</div>
            <div class="cart-row-code">Код: ${p.code || '-'}</div>
          </div>
        </div>
        <div class="cart-row-controls">
          <div class="cart-row-price">${(p.price || 0).toLocaleString('ru-RU')} ₽</div>
          <div class="cart-row-qty">
            <button class="qty-btn" data-id="${item.id}" data-action="dec">−</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-id="${item.id}" data-action="inc">+</button>
          </div>
          <div class="cart-row-total">${lineTotal.toLocaleString('ru-RU')} ₽</div>
          <button class="cart-row-remove" data-id="${item.id}">×</button>
        </div>
      `;
      itemsEl.appendChild(row);
    });

    if (!totalCount) {
      saveCart([]);
      itemsEl.innerHTML = '';
      emptyEl.style.display = 'block';
      summaryEl.style.display = 'none';
      orderSection.style.display = 'none';
      return;
    }

    totalCountEl.textContent = `${totalCount} шт.`;
    totalPriceEl.textContent = `${totalPrice.toLocaleString('ru-RU')} ₽`;

    emptyEl.style.display = 'none';
    summaryEl.style.display = 'block';
    orderSection.style.display = 'block';
  }

  itemsEl.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('.qty-btn');
    const delBtn = e.target.closest('.cart-row-remove');

    if (qtyBtn) {
      const id = Number(qtyBtn.dataset.id);
      const action = qtyBtn.dataset.action;
      let cart = getCart();
      const item = cart.find((i) => i.id === id);
      if (!item) return;
      if (action === 'inc') item.qty++;
      if (action === 'dec') item.qty = Math.max(1, item.qty - 1);
      saveCart(cart);
      renderCart();
      return;
    }

    if (delBtn) {
      const id = Number(delBtn.dataset.id);
      let cart = getCart().filter((i) => i.id !== id);
      saveCart(cart);
      renderCart();
    }
  });

  if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('order-name').value.trim();
      const phone = document.getElementById('order-phone').value.trim();
      const city = document.getElementById('order-city').value.trim();
      const comment = document.getElementById('order-comment').value.trim();

      alert(
        'Заявка отправлена!\n\n' +
        'Имя: ' + name + '\n' +
        'Телефон: ' + phone + '\n' +
        'Город: ' + city + '\n\n' +
        'Комментарий:\n' + comment + '\n\n' +
        'Дальше ты сам свяжешься с клиентом по телефону :)'
      );
    });
  }

  renderCart();
}

// =================== INIT ===============================
document.addEventListener('DOMContentLoaded', () => {
  updateCartHeaderCount();
  initCatalogPage();
  loadPopularProducts();
  loadProductDetail();
  initCartPage();
});
