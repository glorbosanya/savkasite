const express = require("express");
const session = require("express-session");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();

// --- Парсинг тела ----------------------------------------------------------
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// --- Статика ---------------------------------------------------------------
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// --- Сессии ----------------------------------------------------------------
app.use(
  session({
    secret: "supersecretkey_esco",
    resave: false,
    saveUninitialized: false,
  })
);

// --- База данных -----------------------------------------------------------
const db = new sqlite3.Database("db.sqlite");

db.run(
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    code TEXT,
    description TEXT,
    price INTEGER,
    category TEXT,
    status TEXT,
    image TEXT   -- сюда пишем data:image/...;base64,....
  )`
);

// --- Multer: файл только в памяти, потом в base64 -------------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Авторизация -----------------------------------------------------------
app.post("/api/login", (req, res) => {
  const { login, password } = req.body;

  // Поменяй на свои
  if (login === "admin" && password === "1234") {
    req.session.auth = true;
    return res.json({ ok: true });
  }

  return res.status(401).json({ error: "invalid_credentials" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

function requireAuth(req, res, next) {
  if (req.session && req.session.auth) return next();
  return res.status(403).json({ error: "not_authorized" });
}

// --- Загрузка изображения: отдаём dataURL ---------------------------------
app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });

  const mime = req.file.mimetype || "image/jpeg";
  const base64 = req.file.buffer.toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  res.json({ dataUrl });
});

// --- API товаров -----------------------------------------------------------

// список (с фильтрами search/category)
app.get("/api/products", (req, res) => {
  const { search, category } = req.query;
  let sql = "SELECT * FROM products WHERE 1=1";
  const params = [];

  if (search) {
    sql += " AND (name LIKE ? OR code LIKE ?)";
    params.push("%" + search + "%", "%" + search + "%");
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "db_error" });
    res.json(rows);
  });
});

// один товар
app.get("/api/products/:id", (req, res) => {
  db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: "db_error" });
    if (!row) return res.status(404).json({ error: "not_found" });
    res.json(row);
  });
});

// создать
app.post("/api/products", requireAuth, (req, res) => {
  const p = req.body;
  db.run(
    `INSERT INTO products (name, code, description, price, category, status, image)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      p.name,
      p.code,
      p.description,
      p.price,
      p.category,
      p.status,
      p.image || null,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "db_error" });
      res.json({ id: this.lastID });
    }
  );
});

// обновить
app.put("/api/products/:id", requireAuth, (req, res) => {
  const p = req.body;
  db.run(
    `UPDATE products SET
      name = ?, code = ?, description = ?, price = ?,
      category = ?, status = ?, image = ?
     WHERE id = ?`,
    [
      p.name,
      p.code,
      p.description,
      p.price,
      p.category,
      p.status,
      p.image || null,
      req.params.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: "db_error" });
      res.json({ ok: true, changed: this.changes });
    }
  );
});

// удалить
app.delete("/api/products/:id", requireAuth, (req, res) => {
  db.run(
    "DELETE FROM products WHERE id = ?",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: "db_error" });
      res.json({ ok: true, deleted: this.changes });
    }
  );
});

// --- Красивые URL для страниц ---------------------------------------------
app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/catalog", (_req, res) => {
  res.sendFile(path.join(publicDir, "catalog.html"));
});

app.get("/product", (_req, res) => {
  res.sendFile(path.join(publicDir, "product.html"));
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(publicDir, "admin.html"));
});

// --- Старт сервера ---------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
