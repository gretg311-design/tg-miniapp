import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import pool, { initDB } from "./db/init.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

await initDB();

/* ================= TELEGRAM CHECK ================= */

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

/* ================= API ================= */

app.post("/api/init", async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: "NO_INIT_DATA" });

    if (!verifyTelegram(initData)) {
      return res.status(403).json({ error: "BAD_TELEGRAM_AUTH" });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user"));

    await pool.query(
      `INSERT INTO users (telegram_id, username)
       VALUES ($1, $2)
       ON CONFLICT (telegram_id) DO NOTHING`,
      [user.id, user.username]
    );

    res.json({ ok: true, user });
  } catch (e) {
    console.error("API ERROR:", e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server started");
});
