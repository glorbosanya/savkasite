// Бургер-меню
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

// === Самокат + бернаут =====================================================
const scrollScooter = document.getElementById('scroll-scooter');
const scooterWrapper = document.querySelector('.hero-scooter-wrapper');

if (scrollScooter && scooterWrapper) {
  // параллакс до тех пор, пока не активен бернаут
  window.addEventListener('scroll', () => {
    if (scrollScooter.classList.contains('burnout-active')) return;
    const offset = window.scrollY * 0.15;
    scrollScooter.style.transform = `translateY(${offset}px) rotate(${offset / 40}deg)`;
  });

  // включаем бернаут по наведению
  scooterWrapper.addEventListener('mouseenter', () => {
    scrollScooter.classList.add('burnout-active');
  });

  // выключаем по уходу курсора
  scooterWrapper.addEventListener('mouseleave', () => {
    scrollScooter.classList.remove('burnout-active');
    scrollScooter.style.transform = '';
  });
}

// === IntersectionObserver для карточек =====================================
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

// Вспомогательная — определяем src картинки товара
function imgSrcFromProduct(p, fallback = 'img/scooter2.png') {
  if (!p.image) return fallback;
  if (typeof p.image === 'string' && p.image.startsWith('data:')) {
    return p.image; // храним dataURL
  }
  return '/uploads/' + p.image; // старый вариант
}

// --- Каталог ---------------------------------------------------------------
async function loadCatalogProducts() {
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
    products.forEach(p => {
      const card = document.createElement('a');
      card.className = 'product-card';
      card.href = `/product?id=${p.id}`;

      const statusClass = p.status === 'in_stock' ? 'badge-in' : 'badge-await';
      const statusText = p.status === 'in_stock' ? 'В наличии' : 'Ожидается';
      const imgPath = imgSrcFromProduct(p, 'img/scooter2.png');

      card.innerHTML = `
        <div class="product-thumb">
          <img src="${imgPath}" alt="${p.name}">
        </div>
        <h4>${p.name}</h4>
        <p class="product-code">Код: ${p.code || '-'}</p>
        <div class="product-bottom">
          <span class="price">${(p.price || 0).toLocaleString('ru-RU')} ₽</span>
          <span class="badge ${statusClass}">${statusText}</span>
        </div>
      `;
      listEl.appendChild(card);
      observer.observe(card);
    });
  }

  if (searchInput) searchInput.addEventListener('input', reload);
  if (categorySelect) categorySelect.addEventListener('change', reload);
  reload();
}

// --- Популярные ------------------------------------------------------------
async function loadPopularProducts() {
  const container = document.getElementById('popular-products');
  if (!container) return;

  const res = await fetch('/api/products');
  let products = await res.json();
  products = products.slice(0, 4);

  container.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('a');
    card.className = 'product-card';
    card.href = `/product?id=${p.id}`;

    const statusClass = p.status === 'in_stock' ? 'badge-in' : 'badge-await';
    const statusText = p.status === 'in_stock' ? 'В наличии' : 'Ожидается';
    const imgPath = imgSrcFromProduct(p, 'img/scooter3.png');

    card.innerHTML = `
      <div class="product-thumb">
        <img src="${imgPath}" alt="${p.name}">
      </div>
      <h4>${p.name}</h4>
      <div class="product-bottom">
        <span class="price">${(p.price || 0).toLocaleString('ru-RU')} ₽</span>
        <span class="badge ${statusClass}">${statusText}</span>
      </div>
    `;
    container.appendChild(card);
    observer.observe(card);
  });
}

// --- Страница товара -------------------------------------------------------
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
  const imgPath = imgSrcFromProduct(p, 'img/scooter2.png');

  detailEl.innerHTML = `
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
        <p class="eks-muted small">
          Для заказа запчасти или уточнения наличия позвони
          <a href="tel:+79998887766">+7 (999) 888-77-66</a>.
        </p>
        <a href="/catalog" class="btn btn-ghost">← Вернуться в каталог</a>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  loadCatalogProducts();
  loadPopularProducts();
  loadProductDetail();
});
