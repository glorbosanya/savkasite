
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// === FILE UPLOAD CONFIG =====================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const safeName = Date.now() + '_' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// === SESSION / AUTH =========================================================
app.use(session({
  secret: 'super-secret-esco-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 часа
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  return res.status(401).json({ error: 'not_authorized' });
}

// === DATABASE ===============================================================
const dbPath = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      price INTEGER NOT NULL,
      category TEXT,
      status TEXT,
      image TEXT
    )
  `);

  // seed minimal data if empty
  db.get('SELECT COUNT(*) AS cnt FROM products', (err, row) => {
    if (err) {
      console.error('DB error:', err);
      return;
    }
    if (row.cnt === 0) {
      console.log('Seeding demo products...');
      const stmt = db.prepare(`
        INSERT INTO products
          (name, code, description, price, category, status, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const demo = [
        [
          'Сигнализация (пульт + блок), 4 кнопки',
          'OA00004',
          'Комплект сигнализации: блок управления и пульт с 4 кнопками.',
          350,
          'электрика',
          'in_stock',
          null
        ],
        [
          'Держатель для телефона (брендированный)',
          'AT00005',
          'Фирменный держатель для телефона, совместим с большинством рулей.',
          375,
          'аксессуары',
          'in_stock',
          null
        ],
        [
          'Фара большая передняя круглая (с защитой линзы)',
          'C3000008-1',
          'Яркая передняя фара с защитой линзы для ночных поездок.',
          950,
          'свет',
          'in_stock',
          null
        ]
      ];

      demo.forEach(p => stmt.run(p));
      stmt.finalize();
    }
  });
});

// === MIDDLEWARE =============================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === AUTH ROUTES ============================================================
app.post('/api/login', (req, res) => {
  const { login, password } = req.body;

  // простейший вариант: логин/пароль в коде
  if (login === 'admin' && password === '1234') {
    req.session.loggedIn = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'invalid_credentials' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// === PRODUCT API (public read) ==============================================
app.get('/api/products', (req, res) => {
  const { search, category } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (name LIKE ? OR code LIKE ?)';
    params.push('%' + search + '%', '%' + search + '%');
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'db_error' });
    res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'db_error' });
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json(row);
  });
});

// === PRODUCT API (admin – requires auth) ====================================
app.post('/api/products', requireAuth, (req, res) => {
  const { name, code, description, price, category, status, image } = req.body;
  db.run(
    `
      INSERT INTO products
        (name, code, description, price, category, status, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [name, code, description, price, category, status, image],
    function (err) {
      if (err) return res.status(500).json({ error: 'db_error' });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  const { name, code, description, price, category, status, image } = req.body;
  db.run(
    `
      UPDATE products
      SET name = ?, code = ?, description = ?, price = ?,
          category = ?, status = ?, image = ?
      WHERE id = ?
    `,
    [name, code, description, price, category, status, image, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'db_error' });
      res.json({ changed: this.changes });
    }
  );
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  db.run(
    'DELETE FROM products WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'db_error' });
      res.json({ deleted: this.changes });
    }
  );
});

// === IMAGE UPLOAD (admin) ===================================================
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  res.json({
    filename: req.file.filename,
    url: '/uploads/' + req.file.filename
  });
});

// === FALLBACK ROUTES FOR SPA-LIKE NAV (optional) ============================
// For direct navigation to admin/login
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// === START SERVER ===========================================================
app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
});
