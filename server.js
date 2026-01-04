import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;8028858195:AAFZ8YJoZKZY0Lf3cnCH3uLp6cECTNEcwOU

// 🔐 ID ГЛАВНОГО АДМИНА (ТВОЙ TELEGRAM ID)
const MAIN_ADMIN_ID = 8287041036; // ← ЗАМЕНИ НА СВОЙ ID

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static("public"));

function checkTelegramAuth(initData) {
  const secret = crypto.createHash("sha256").update(BOT_TOKEN).digest();

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

app.post("/api/auth", (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ ok: false });

  if (!checkTelegramAuth(initData)) {
    return res.status(403).json({ ok: false });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));

  return res.json({
    ok: true,
    user,
    isAdmin: user.id === MAIN_ADMIN_ID
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
