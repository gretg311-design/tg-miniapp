import express from "express";
import crypto from "crypto";
import pool, { initDB } from "./db/init.js";

const app = express();
app.use(express.json());

await initDB();

/* ===== TELEGRAM VERIFY ===== */

function verifyTelegram(initData) {
  const secret = crypto
    .createHash("sha256")
    .update(process.env.BOT_TOKEN)
    .digest();

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  return hmac === hash;
}

/* ===== API ===== */

app.post("/api/init", async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: "NO_INIT_DATA" });

    if (!verifyTelegram(initData)) {
      return res.status(403).json({ error: "BAD_AUTH" });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user"));

    await pool.query(
      `INSERT INTO users (telegram_id, username)
       VALUES ($1, $2)
       ON CONFLICT (telegram_id) DO NOTHING`,
      [user.id, user.username]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ API ERROR:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* ===== HEALTH ===== */

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server started");
});
