import express from "express";
import fetch from "node-fetch";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const BOT_TOKEN = process.env.BOT_TOKEN || "PUT_TELEGRAM_BOT_TOKEN_HERE";
const OPENROUTER_KEY = process.env.OPENROUTER_KEY || "PUT_OPENROUTER_KEY_HERE";
const OWNER_ID = 8287041036;

const app = express();
app.use(express.json());

const db = await open({
  filename: "./database.db",
  driver: sqlite3.Database
});

await db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  nickname TEXT,
  gender TEXT,
  balance INTEGER DEFAULT 100,
  sub TEXT DEFAULT 'Free'
);

CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  description TEXT,
  system_prompt TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  user_id INTEGER,
  char_id INTEGER,
  role TEXT,
  content TEXT
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY
);
`);

app.post("/api/init", async (req, res) => {
  const { id, nickname, gender } = req.body;
  let user = await db.get("SELECT * FROM users WHERE id=?", id);
  if (!user) {
    await db.run(
      "INSERT INTO users (id, nickname, gender) VALUES (?,?,?)",
      id, nickname, gender
    );
  }
  res.json({ ok: true });
});

app.get("/api/profile/:id", async (req, res) => {
  const user = await db.get("SELECT * FROM users WHERE id=?", req.params.id);
  res.json(user);
});

app.get("/api/chars", async (_, res) => {
  const chars = await db.all("SELECT * FROM characters");
  res.json(chars);
});

app.post("/api/chat", async (req, res) => {
  const { user_id, char_id, text } = req.body;

  const history = await db.all(
    "SELECT role, content FROM messages WHERE user_id=? AND char_id=?",
    user_id, char_id
  );

  const char = await db.get("SELECT * FROM characters WHERE id=?", char_id);

  const messages = [
    { role: "system", content: char.system_prompt },
    ...history,
    { role: "user", content: text }
  ];

  const ai = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages,
      max_tokens: 300
    })
  }).then(r => r.json());

  const reply = ai.choices[0].message.content;

  await db.run("INSERT INTO messages VALUES (?,?,?,?)", user_id, char_id, "user", text);
  await db.run("INSERT INTO messages VALUES (?,?,?,?)", user_id, char_id, "assistant", reply);

  res.json({ reply });
});

app.post("/api/admin/give", async (req, res) => {
  const { admin_id, target_id, amount } = req.body;
  const admin = await db.get("SELECT * FROM admins WHERE id=?", admin_id);

  if (admin_id !== OWNER_ID && !admin) {
    return res.status(403).json({ error: "forbidden" });
  }

  await db.run(
    "UPDATE users SET balance = balance + ? WHERE id=?",
    amount, target_id
  );

  res.json({ ok: true });
});

app.listen(3000, () => console.log("SERVER OK"));
