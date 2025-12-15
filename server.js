// server.js — backend c PostgreSQL, автосозданием таблиц и защитой админки

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session"); // <— добавили сессии
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Подключение к PostgreSQL ----------

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("localhost")
      ? { rejectUnauthorized: false }
      : false,
});

pool
  .connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => console.error("DB connection error:", err));

// ---------- Автосоздание таблиц ----------

async function initDb() {
  // таблица товаров
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      category TEXT,
      price INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in_stock',
      quantity INTEGER DEFAULT 0,
      image TEXT
    );
  `);

  // таблица заказов
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT,
      phone TEXT,
      city TEXT,
      comment TEXT,
      total_price INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // позиции заказа
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER,
      name TEXT,
      code TEXT,
      price INTEGER DEFAULT 0,
      qty INTEGER DEFAULT 0,
      line_total INTEGER DEFAULT 0
    );
  `);

  console.log("DB tables ready");
}

// ---------- Middleware ----------

// сессии (для авторизации админа)
app.use(
  session({
    secret: "savkasite_super_secret_228_1337", // можешь поменять на любой длинный набор символов
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// папка для картинок
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer для загрузки файлов
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const safeName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  },
});
const upload = multer({ storage });

// ---------- Middleware: защита админки ----------

function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) {
    return next();
  }
  return res.redirect("/login");
}

// ---------- Страницы ----------

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/catalog", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "catalog.html"));
});

app.get("/product", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "product.html"));
});

app.get("/cart", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cart.html"));
});

// админка защищена
app.get("/admin", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// заказы — тоже под паролем
app.get("/admin-orders", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-orders.html"));
});

// страница логина (открыта для всех)
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ---------- API логина ----------

app.post("/api/login", (req, res) => {
  const { login, password } = req.body || {};

  // ТВОЙ ЛОГИН/ПАРОЛЬ:
  const ADMIN_LOGIN = "admin";
  const ADMIN_PASS = "AzSx378";

  if (login === ADMIN_LOGIN && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    return res.json({ success: true });
  }

  return res.json({ success: false });
});

// ---------- API: ТОВАРЫ ----------

// список товаров с поиском (доступен и для витрины, и для админки)
app.get("/api/products", async (req, res) => {
  try {
    const { search, category } = req.query;
    const where = [];
    const params = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where.push(
        `(LOWER(name) LIKE $${params.length} OR LOWER(code) LIKE $${params.length})`
      );
    }

    if (category) {
      params.push(category.toLowerCase());
      where.push(`LOWER(category) = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query(
      `
      SELECT id, name, code, description, category, price, status, quantity, image
      FROM products
      ${whereSql}
      ORDER BY id DESC
    `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/products error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// один товар
app.get("/api/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `
      SELECT id, name, code, description, category, price, status, quantity, image
      FROM products
      WHERE id = $1
    `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/products/:id error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// добавить товар (через админку)
app.post("/api/products", upload.single("image"), async (req, res) => {
  try {
    const {
      name = "",
      code = "",
      description = "",
      category = "",
      price = 0,
      status = "in_stock",
      quantity = 0,
    } = req.body || {};

    const image = req.file ? "/uploads/" + req.file.filename : null;

    const result = await pool.query(
      `
      INSERT INTO products
        (name, code, description, category, price, status, quantity, image)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, name, code, description, category, price, status, quantity, image
    `,
      [
        name,
        code,
        description,
        category,
        Number(price) || 0,
        status,
        Number(quantity) || 0,
        image,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/products error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// обновить товар
app.put("/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      name = "",
      code = "",
      description = "",
      category = "",
      price = 0,
      status = "in_stock",
      quantity = 0,
      currentImage = "",
    } = req.body || {};

    const image = req.file ? "/uploads/" + req.file.filename : currentImage || null;

    const result = await pool.query(
      `
      UPDATE products SET
        name = $1,
        code = $2,
        description = $3,
        category = $4,
        price = $5,
        status = $6,
        quantity = $7,
        image = $8
      WHERE id = $9
      RETURNING id, name, code, description, category, price, status, quantity, image
    `,
      [
        name,
        code,
        description,
        category,
        Number(price) || 0,
        status,
        Number(quantity) || 0,
        image,
        id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/products/:id error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// удалить товар
app.delete("/api/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/products/:id error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// ---------- API: ЗАКАЗЫ ----------

// получить все заказы (используется /admin-orders)
app.get("/api/orders", async (req, res) => {
  try {
    const ordersRes = await pool.query(`
      SELECT id, customer_name, phone, city, comment, total_price, created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    const itemsRes = await pool.query(`
      SELECT id, order_id, product_id, name, code, price, qty, line_total
      FROM order_items
    `);

    const itemsByOrder = {};
    itemsRes.rows.forEach((it) => {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push({
        id: it.id,
        productId: it.product_id,
        name: it.name,
        code: it.code,
        price: it.price,
        qty: it.qty,
        lineTotal: it.line_total,
      });
    });

    const result = ordersRes.rows.map((o) => ({
      id: o.id,
      name: o.customer_name,
      phone: o.phone,
      city: o.city,
      comment: o.comment,
      totalPrice: o.total_price,
      createdAt: o.created_at,
      items: itemsByOrder[o.id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error("GET /api/orders error:", err);
    res.status(500).json({ error: "db_error" });
  }
});

// создать заказ (используется корзиной на сайте)
app.post("/api/orders", async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const {
      name = "",
      phone = "",
      city = "",
      comment = "",
      items = [],
      totalPrice = 0,
    } = body;

    await client.query("BEGIN");

    const orderRes = await client.query(
      `
      INSERT INTO orders (customer_name, phone, city, comment, total_price)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, customer_name, phone, city, comment, total_price, created_at
    `,
      [name, phone, city, comment, Number(totalPrice) || 0]
    );
    const order = orderRes.rows[0];

    for (const it of items) {
      await client.query(
        `
        INSERT INTO order_items
          (order_id, product_id, name, code, price, qty, line_total)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
        [
          order.id,
          it.productId || null,
          it.name || "",
          it.code || "",
          Number(it.price) || 0,
          Number(it.qty) || 0,
          Number(it.lineTotal) || 0,
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      id: order.id,
      name: order.customer_name,
      phone: order.phone,
      city: order.city,
      comment: order.comment,
      totalPrice: order.total_price,
      createdAt: order.created_at,
      items,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/orders error:", err);
    res.status(500).json({ error: "db_error" });
  } finally {
    client.release();
  }
});

// ---------- Запуск сервера ----------

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server listening on port " + PORT);
    });
  })
  .catch((err) => {
    console.error("Failed to init DB", err);
    process.exit(1);
  });
