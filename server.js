const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const OWNER_ID = 8287041036;

const db = new sqlite3.Database("./db.sqlite");

db.serialize(() => {
  // Пользователи + Настройки
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    balance INTEGER DEFAULT 100,
    sub_type TEXT DEFAULT 'Free',
    lang TEXT DEFAULT 'ru',
    purity INTEGER DEFAULT 50,
    jealousy INTEGER DEFAULT 50,
    msg_length INTEGER DEFAULT 45
  )`);

  // Персонажи
  db.run(`CREATE TABLE IF NOT EXISTS chars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    gender TEXT,
    age INTEGER,
    desc TEXT,
    is_18 INTEGER DEFAULT 0
  )`);

  // Промокоды
  db.run(`CREATE TABLE IF NOT EXISTS promos (code TEXT PRIMARY KEY, reward INTEGER, uses INTEGER)`);
  
  // Админы
  db.run(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY)`);

  // Наполнение 100 персонажами (упрощенно для старта)
  db.get("SELECT count(*) as count FROM chars", (err, row) => {
    if (row.count === 0) {
      const genders = ['male', 'female'];
      for (let i = 1; i <= 100; i++) {
        const g = genders[i % 2];
        const age = Math.floor(Math.random() * (35 - 18 + 1)) + 18;
        db.run("INSERT INTO chars (name, gender, age, desc) VALUES (?, ?, ?, ?)", 
        [g === 'female' ? `Девушка ${i}` : `Парень ${i}`, g, age, `Персонаж №${i}, готов к общению.`]);
      }
    }
  });
});

app.use(express.json());
app.use(express.static("public"));

// Получение данных и ролей
app.post("/api/user", (req, res) => {
  const { id } = req.body;
  db.get("SELECT * FROM users WHERE id=?", [id], (err, user) => {
    if (!user) {
      db.run("INSERT INTO users(id) VALUES(?)", [id], () => res.json({id, role:'user'}));
    } else {
      db.get("SELECT id FROM admins WHERE id=?", [id], (err, admin) => {
        const role = (id == OWNER_ID) ? 'owner' : (admin ? 'admin' : 'user');
        res.json({ ...user, role });
      });
    }
  });
});

// Сохранение настроек
app.post("/api/settings", (req, res) => {
  const { id, lang, purity, jealousy, msg_length } = req.body;
  db.run("UPDATE users SET lang=?, purity=?, jealousy=?, msg_length=? WHERE id=?", 
  [lang, purity, jealousy, msg_length, id], () => res.json({success: true}));
});

// Промокоды
app.post("/api/promo/use", (req, res) => {
  const { id, code } = req.body;
  db.get("SELECT * FROM promos WHERE code=?", [code], (err, promo) => {
    if (promo && promo.uses > 0) {
      db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [promo.reward, id]);
      db.run("UPDATE promos SET uses = uses - 1 WHERE code = ?", [code]);
      res.json({success: true, reward: promo.reward});
    } else {
      res.json({success: false, message: "Неверный или использован"});
    }
  });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.listen(PORT, () => console.log("System Active"));
