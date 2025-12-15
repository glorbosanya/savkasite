const express = require("express");
const session = require("express-session");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();

// === Настройки ===
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static для public
app.use(express.static(path.join(__dirname, "public")));

// === Сессии (работают на Render) ===
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

// === База данных ===
const db = new sqlite3.Database("db.sqlite");

// Создаём таблицу, если нет
db.run(
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    code TEXT,
    description TEXT,
    price INTEGER,
    category TEXT,
    status TEXT,
    image TEXT
  )`
);

// === Хранилище загрузок (Render FREE поддерживает только /tmp) ===
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/tmp"); // Пишем в /tmp вместо uploads/
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 999999);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const upload = multer({ storage });

// === Отдача файлов из /tmp ===
app.get("/uploads/:filename", (req, res) => {
  const filePath = "/tmp/" + req.params.filename;

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    return res.status(404).send("File not found.");
  }
});

// === API: Авторизация ===
app.post("/api/login", (req, res) => {
  const { login, password } = req.body;

  // ХАРДКОД – поменяй на свои данные
  if (login === "admin" && password === "1234") {
    req.session.auth = true;
    return res.json({ ok: true });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

// Middleware проверки админа
function auth(req, res, next) {
  if (req.session.auth) return next();
  res.status(403).json({ error: "Not authorized" });
}

// === API: Загрузка фото ===
app.post("/api/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  res.json({
    filename: req.file.filename, // лежит в /tmp
  });
});

// === API: CRUD товаров ===

// Получить все товары
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// Получить товар по id
app.get("/api/products/:id", (req, res) => {
  db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});

// Создать товар
app.post("/api/products", auth, (req, res) => {
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
      if (err) return res.status(500).json({ error: err });
      res.json({ id: this.lastID });
    }
  );
});

// Обновить товар
app.put("/api/products/:id", auth, (req, res) => {
  const p = req.body;

  db.run(
    `UPDATE products SET
      name=?, code=?, description=?, price=?, category=?, status=?, image=?
     WHERE id=?`,
    [
      p.name,
      p.code,
      p.description,
      p.price,
      p.category,
      p.status,
      p.image,
      req.params.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err });
      res.json({ ok: true });
    }
  );
});

// Удалить товар
app.delete("/api/products/:id", auth, (req, res) => {
  db.run(
    `DELETE FROM products WHERE id=?`,
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err });
      res.json({ ok: true });
    }
  );
});

// === Порты для Render ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
