import express from "express";
import pg from "pg";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// ============ БАЗА ДАННЫХ ============

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch(err => console.error("DB ERROR:", err));


// Создание таблицы при запуске
pool.query(`
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    category TEXT,
    stock INTEGER DEFAULT 0,
    image TEXT
  );
`).then(() => console.log("Table ready"))
  .catch(err => console.error(err));


// ============ Загрузка файлов ============
const upload = multer({ dest: "public/uploads/" });

// ============ API ============

// Получить все товары
app.get("/api/products", async (req, res) => {
  const result = await pool.query("SELECT * FROM products ORDER BY id DESC");
  res.json(result.rows);
});

// Получить товар по ID
app.get("/api/products/:id", async (req, res) => {
  const id = req.params.id;
  const result = await pool.query("SELECT * FROM products WHERE id=$1", [id]);
  res.json(result.rows[0]);
});

// Добавить товар
app.post("/api/products", upload.single("image"), async (req, res) => {
  const { name, price, description, category, stock } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      "INSERT INTO products (name, price, description, category, stock, image) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [name, price, description, category, stock, image]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка добавления товара" });
  }
});

// Удалить товар
app.delete("/api/products/:id", async (req, res) => {
  await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

// Обновить товар
app.put("/api/products/:id", async (req, res) => {
  const { name, price, description, category, stock } = req.body;

  const result = await pool.query(
    `UPDATE products 
     SET name=$1, price=$2, description=$3, category=$4, stock=$5 
     WHERE id=$6 
     RETURNING *`,
    [name, price, description, category, stock, req.params.id]
  );

  res.json(result.rows[0]);
});


// ======= Важно: КЛИЕНТ (index.html и все остальные) =======

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});


// ============ Запуск сервера ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
