import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

// 🔐 API — ВАЖНО: ВЫШЕ ЛЮБЫХ *
app.post("/api/auth", (req, res) => {
  console.log("INIT DATA RAW:", req.body.initData);

  if (!req.body.initData) {
    return res.json({ ok: false, reason: "NO_INIT_DATA" });
  }

  const params = new URLSearchParams(req.body.initData);
  const userRaw = params.get("user");

  return res.json({
    ok: true,
    user: userRaw ? JSON.parse(userRaw) : null
  });
});

// ❗ ТОЛЬКО ДЛЯ СТРАНИЦЫ
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
