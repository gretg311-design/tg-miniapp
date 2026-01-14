const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Создаем базу данных
const db = new sqlite3.Database("./db.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      balance INTEGER DEFAULT 100,
      last_daily INTEGER DEFAULT 0
    )
  `);
});

app.use(express.json());
app.use(express.static("public"));

// API: Вход пользователя
app.post("/api/user", (req, res) => {
  const { id } = req.body;
  if (!id) return res.json({ error: "no id" });

  db.get("SELECT * FROM users WHERE id=?", [id], (err, row) => {
    if (!row) {
      db.run("INSERT INTO users(id, balance) VALUES(?, ?)", [id, 100], () => {
        res.json({ id, balance: 100 });
      });
    } else {
      res.json(row);
    }
  });
});

// API: Ежедневный бонус
app.post("/api/daily", (req, res) => {
  const { id } = req.body;
  const now = Date.now();
  db.get("SELECT last_daily FROM users WHERE id=?", [id], (err, row) => {
    if (row && (now - row.last_daily > 86400000)) {
      db.run("UPDATE users SET balance = balance + 50, last_daily = ? WHERE id = ?", [now, id], () => {
        res.json({ success: true, reward: 50 });
      });
    } else {
      res.json({ success: false, message: "Заходи завтра!" });
    }
  });
});

// API: Тестовая покупка (Донат)
app.post("/api/buy", (req, res) => {
  const { id, amount } = req.body;
  db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, id], () => {
    db.get("SELECT balance FROM users WHERE id=?", [id], (err, row) => {
      res.json({ balance: row.balance });
    });
  });
});

// Главная страница
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => {
  console.log("AnimeAI запущен на порту:", PORT);
});
