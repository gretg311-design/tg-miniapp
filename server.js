const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- DB ----------
const db = new sqlite3.Database("./db.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      balance INTEGER DEFAULT 100,
      sub TEXT DEFAULT 'Free'
    )
  `);
});

app.use(express.json());
app.use(express.static("public"));

// ---------- API ----------
app.post("/api/user", (req, res) => {
  const { id } = req.body;
  if (!id) return res.json({ error: "no id" });

  db.get("SELECT * FROM users WHERE id=?", [id], (err, row) => {
    if (!row) {
      db.run("INSERT INTO users(id) VALUES(?)", [id]);
      return res.json({ id, balance: 100, sub: "Free" });
    }
    res.json(row);
  });
});

// ---------- MAIN ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => {
  console.log("AnimeAI running on", PORT);
});
