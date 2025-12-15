const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// ---------- helpers ----------
async function ensureDataFile(file) {
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(file, '[]', 'utf8');
  }
}

async function readJson(file) {
  await ensureDataFile(file);
  const txt = await fs.readFile(file, 'utf8');
  return txt ? JSON.parse(txt) : [];
}

async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

// ---------- middlewares ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- pages ----------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/catalog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'catalog.html'));
});

app.get('/product', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'product.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ---------- PRODUCTS API ----------
app.get('/api/products', async (req, res) => {
  const products = await readJson(PRODUCTS_FILE);
  let filtered = products;

  const { search, category } = req.query;

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.code && p.code.toLowerCase().includes(s))
    );
  }

  if (category) {
    const c = category.toLowerCase();
    filtered = filtered.filter(
      (p) => p.category && p.category.toLowerCase() === c
    );
  }

  res.json(filtered);
});

app.get('/api/products/:id', async (req, res) => {
  const products = await readJson(PRODUCTS_FILE);
  const id = Number(req.params.id);
  const p = products.find((pr) => pr.id === id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.post('/api/products', async (req, res) => {
  const products = await readJson(PRODUCTS_FILE);
  const body = req.body || {};

  const newId = products.length
    ? Math.max(...products.map((p) => p.id || 0)) + 1
    : 1;

  const product = {
    id: newId,
    name: body.name || '',
    code: body.code || '',
    description: body.description || '',
    category: body.category || '', // сюда можно ставить "аренда"
    price: Number(body.price) || 0,
    status: body.status || 'in_stock',
    quantity: Number(body.quantity) || 0, // <-- количество
    image: body.image || ''
  };

  products.push(product);
  await writeJson(PRODUCTS_FILE, products);
  res.json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const products = await readJson(PRODUCTS_FILE);
  const id = Number(req.params.id);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const body = req.body || {};
  const prev = products[idx];

  products[idx] = {
    ...prev,
    ...body,
    price: Number(body.price ?? prev.price) || 0,
    quantity: Number(body.quantity ?? prev.quantity) || 0
  };

  await writeJson(PRODUCTS_FILE, products);
  res.json(products[idx]);
});

app.delete('/api/products/:id', async (req, res) => {
  const products = await readJson(PRODUCTS_FILE);
  const id = Number(req.params.id);
  const filtered = products.filter((p) => p.id !== id);
  await writeJson(PRODUCTS_FILE, filtered);
  res.json({ success: true });
});

// ---------- ORDERS API ----------
app.get('/api/orders', async (req, res) => {
  const orders = await readJson(ORDERS_FILE);
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // новые сверху
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const orders = await readJson(ORDERS_FILE);
  const body = req.body || {};

  const newId = orders.length
    ? Math.max(...orders.map((o) => o.id || 0)) + 1
    : 1;

  const order = {
    id: newId,
    name: body.name || '',
    phone: body.phone || '',
    city: body.city || '',
    comment: body.comment || '',
    items: body.items || [],
    totalPrice: Number(body.totalPrice) || 0,
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  await writeJson(ORDERS_FILE, orders);
  res.json(order);
});

// ---------- start ----------
app.listen(PORT, () => {
  console.log('Server listening on port ' + PORT);
});
