const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const OWNER_ID = 8287041036; // Твой ID

const db = new sqlite3.Database("./db.sqlite");

db.serialize(() => {
  // Юзеры (добавили тип подписки и время)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, 
    balance INTEGER DEFAULT 100, 
    last_daily INTEGER DEFAULT 0,
    sub_type TEXT DEFAULT 'Free',
    sub_expire INTEGER DEFAULT 0
  )`);
  
  // Админы
  db.run(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY)`);
  
  // Логи выдач (для овнера)
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    target_id INTEGER,
    action TEXT,
    time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.use(express.json());
app.use(express.static("public"));

// Проверка прав (Middleware)
const checkAuth = (req, res, next) => {
  const { adminId } = req.body;
  if (adminId == OWNER_ID) return next();
  db.get("SELECT id FROM admins WHERE id=?", [adminId], (err, row) => {
    if (row) next();
    else res.status(403).json({ error: "Нет прав" });
  });
};

// --- API ДЛЯ ЮЗЕРОВ ---
app.post("/api/user", (req, res) => {
  const { id } = req.body;
  db.get("SELECT * FROM users WHERE id=?", [id], (err, row) => {
    if (!row) {
      db.run("INSERT INTO users(id) VALUES(?)", [id], () => res.json({id, balance:100, sub_type:'Free'}));
    } else {
      const isOwner = id == OWNER_ID;
      db.get("SELECT id FROM admins WHERE id=?", [id], (err, admin) => {
        res.json({ ...row, role: isOwner ? 'owner' : (admin ? 'admin' : 'user') });
      });
    }
  });
});

// --- КОНСОЛЬ (ЗАЩИЩЕНО) ---

// Выдача осколков
app.post("/api/admin/give", checkAuth, (req, res) => {
  const { targetId, amount, adminId } = req.body;
  db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, targetId], () => {
    db.run("INSERT INTO logs (admin_id, target_id, action) VALUES (?, ?, ?)", [adminId, targetId, `Выдал ${amount} осколков`]);
    res.json({ success: true });
  });
});

// Управление админами (только овнер)
app.post("/api/owner/add-admin", (req, res) => {
  const { targetId, adminId } = req.body;
  if (adminId != OWNER_ID) return res.status(403).send("Только овнер");
  db.run("INSERT OR IGNORE INTO admins(id) VALUES(?)", [targetId], () => res.json({ success: true }));
});

// Просмотр логов (только овнер)
app.post("/api/owner/logs", (req, res) => {
  if (req.body.adminId != OWNER_ID) return res.status(403).send("Нет прав");
  db.all("SELECT * FROM logs ORDER BY time DESC LIMIT 50", (err, rows) => res.json(rows));
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.listen(PORT, () => console.log("Protected Server on", PORT));
