import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const MAIN_ADMIN_ID = String(process.env.MAIN_ADMIN_ID);

// ES modules fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static("public"));

// 🔐 Проверка Telegram initData
function checkTelegramAuth(initData) {
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

// 🔐 AUTH
app.post("/api/auth", (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ ok: false });

  const valid = checkTelegramAuth(initData);
  if (!valid) return res.status(403).json({ ok: false });

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));

  res.json({ ok: true, user });
});

// 👤 ПРОСТО ВОЗВРАТ ЮЗЕРА (БЕЗ БД)
app.post("/api/me", (req, res) => {
  const { user } = req.body;

  res.json({
    id: user.id,
    username: user.username,
    balance: 50,
    sub: "free",
    isMainAdmin: String(user.id) === MAIN_ADMIN_ID
  });
});

// fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
