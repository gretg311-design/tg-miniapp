import express from "express";
import pkg from "pg";
import bodyParser from "body-parser";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─────────────────────────────────────
// Telegram init validation
function checkTelegram(initData, botToken) {
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const data = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const checkHash = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return checkHash === hash;
}

// ─────────────────────────────────────
// INIT USER
app.post("/api/init", async (req, res) => {
  const { initData, userId } = req.body;

  if (!checkTelegram(initData, process.env.BOT_TOKEN)) {
    return res.status(403).json({ error: "Bad Telegram auth" });
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id BIGINT PRIMARY KEY,
        shards INT DEFAULT 50,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await pool.query(
      "SELECT shards FROM users WHERE telegram_id=$1",
      [userId]
    );

    if (result.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (telegram_id) VALUES ($1)",
        [userId]
      );
      return res.json({ shards: 50 });
    }

    res.json({ shards: result.rows[0].shards });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB error" });
  }
});

// ─────────────────────────────────────
// MESSAGE → MINUS SHARD
app.post("/api/message", async (req, res) => {
  const { userId } = req.body;

  try {
    const q = await pool.query(
      "SELECT shards FROM users WHERE telegram_id=$1",
      [userId]
    );

    if (q.rows.length === 0) {
      return res.json({ ok: false, message: "User not found" });
    }

    if (q.rows[0].shards <= 0) {
      return res.json({
        ok: false,
        message: "❌ Лунные осколки закончились"
      });
    }

    await pool.query(
      "UPDATE users SET shards = shards - 1 WHERE telegram_id=$1",
      [userId]
    );

    res.json({
      ok: true,
      shardsLeft: q.rows[0].shards - 1
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

// ─────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("🚀 Server running on port", PORT)
);
