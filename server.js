import express from "express";
import crypto from "crypto";
import { pool } from "./db.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const BOT_TOKEN = process.env.BOT_TOKEN;

// проверка Telegram initData
function checkTelegramAuth(initData) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");

  const dataCheckString = [...urlParams.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHash("sha256")
    .update(BOT_TOKEN)
    .digest();

  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return hmac === hash;
}

// 🔥 ГЛАВНОЕ API
app.post("/api/init", async (req, res) => {
  try {
    const { initData, userId } = req.body;

    if (!checkTelegramAuth(initData)) {
      return res.status(401).json({ error: "Telegram auth failed" });
    }

    // создаём игрока, если нет
    const result = await pool.query(
      `INSERT INTO users (telegram_id)
       VALUES ($1)
       ON CONFLICT (telegram_id) DO NOTHING
       RETURNING *`,
      [userId]
    );

    // если уже был
    const user =
      result.rows[0] ||
      (await pool.query(
        "SELECT * FROM users WHERE telegram_id = $1",
        [userId]
      )).rows[0];

    res.json({
      ok: true,
      shards: user.shards,
      subscription: user.subscription
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});
app.post("/api/message", async (req, res) => {
  try {
    const { userId } = req.body;

    const userRes = await pool.query(
      "SELECT shards FROM users WHERE telegram_id = $1",
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const shards = userRes.rows[0].shards;

    if (shards <= 0) {
      return res.json({
        ok: false,
        message: "❌ Лунные осколки закончились"
      });
    }

    await pool.query(
      "UPDATE users SET shards = shards - 1 WHERE telegram_id = $1",
      [userId]
    );

    res.json({
      ok: true,
      message: "✨ ИИ ответил",
      shardsLeft: shards - 1
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
});

app.listen(3000, () =>
  console.log("🚀 Server running on 3000")
);
