import express from "express";
import crypto from "crypto";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

/* 🔹 ОБЯЗАТЕЛЬНО */
app.use(express.json());
app.use(express.static("public")); // ← ВОТ ОНА, ГЛАВНАЯ СТРОКА

/* 🔹 DB */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    username TEXT,
    first_name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )
`);

console.log("✅ Database ready");

/* 🔹 Telegram check */
function checkTelegram(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = crypto
    .createHash("sha256")
    .update(process.env.BOT_TOKEN)
    .digest();

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  return hmac === hash;
}

/* 🔹 API */
app.post("/api/init", async (req, res) => {
  try {
    const { initData } = req.body;

    if (!checkTelegram(initData)) {
      return res.status(401).json({ ok: false });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user"));

    await pool.query(
      `INSERT INTO users (telegram_id, username, first_name)
       VALUES ($1,$2,$3)
       ON CONFLICT (telegram_id) DO NOTHING`,
      [user.id, user.username, user.first_name]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

/* 🔹 Health */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log("🚀 Server started");
});
