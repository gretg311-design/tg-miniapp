import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db/database.js";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID;

// === ES MODULE FIX ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === MIDDLEWARE ===
app.use(express.json());
app.use(express.static("public"));

/* ===============================
   TELEGRAM AUTH CHECK
================================ */
function checkTelegramAuth(initData) {
  if (!BOT_TOKEN) return false;

  const secret = crypto
    .createHash("sha256")
    .update(BOT_TOKEN)
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

/* ===============================
   DB: GET OR CREATE USER
================================ */
function getOrCreateUser(tgUser) {
  const existing = db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(tgUser.id.toString());

  if (existing) return existing;

  db.prepare(`
    INSERT INTO users (
      telegram_id,
      username,
      role,
      subscription,
      moon_shards,
      created_at
    ) VALUES (?, ?, 'user', 'free', 50, ?)
  `).run(
    tgUser.id.toString(),
    tgUser.username || null,
    Date.now()
  );

  return db
    .prepare("SELECT * FROM users WHERE telegram_id = ?")
    .get(tgUser.id.toString());
}

/* ===============================
   AUTH API
================================ */
app.post("/api/auth", (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: "NO_INIT_DATA" });
    }

    const isValid = checkTelegramAuth(initData);

    if (!isValid) {
      return res.status(403).json({ error: "INVALID_TELEGRAM_AUTH" });
    }

    const params = new URLSearchParams(initData);
    const tgUser = JSON.parse(params.get("user"));

    let user = getOrCreateUser(tgUser);

    // === OWNER CHECK ===
    if (
      OWNER_TELEGRAM_ID &&
      user.telegram_id === OWNER_TELEGRAM_ID &&
      user.role !== "owner"
    ) {
      db.prepare(
        "UPDATE users SET role = 'owner' WHERE telegram_id = ?"
      ).run(user.telegram_id);

      user = db
        .prepare("SELECT * FROM users WHERE telegram_id = ?")
        .get(user.telegram_id);
    }

    return res.json({
      ok: true,
      user: {
        telegram_id: user.telegram_id,
        username: user.username,
        role: user.role,
        subscription: user.subscription,
        moon_shards: user.moon_shards
      }
    });
  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* ===============================
   FALLBACK (SPA)
================================ */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===============================
   START SERVER
================================ */
app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
