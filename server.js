import express from "express";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 ES module fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middleware
app.use(express.json());
app.use(express.static("public"));

// 🧠 DATABASE
const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) {
    console.error("❌ DB error", err);
  } else {
    console.log("✅ Database ready");
  }
});

// 🗂 CREATE TABLES
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id INTEGER UNIQUE,
      username TEXT,
      first_name TEXT,
      role TEXT DEFAULT 'user',
      subscription TEXT DEFAULT 'free',
      sub_until INTEGER,
      moon_shards INTEGER DEFAULT 50,
      created_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_rewards (
      tg_id INTEGER UNIQUE,
      last_claim INTEGER,
      streak INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      gender TEXT,
      age INTEGER,
      personality TEXT,
      description TEXT,
      image_url TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id INTEGER,
      character_id INTEGER,
      created_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER,
      role TEXT,
      content TEXT,
      important INTEGER DEFAULT 0,
      created_at INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_tg_id INTEGER,
      action TEXT,
      target_tg_id INTEGER,
      amount INTEGER,
      created_at INTEGER
    )
  `);
});

// 🧪 TEST ROUTE
app.get("/health", (req, res) => {
  res.send("OK");
});

// fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
