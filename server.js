import express from "express";
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN not set");
  process.exit(1);
}

/* === Telegram HMAC verification === */
function verifyTelegram(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
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

/* === API === */
app.post("/api/verify", (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({ error: "NO_INIT_DATA" });
  }

  const isValid = verifyTelegram(initData);
  if (!isValid) {
    return res.status(403).json({ error: "INVALID_TELEGRAM_DATA" });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));

  res.json({
    ok: true,
    user: {
      id: user.id,
      name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim(),
      username: user.username ?? null,
      premium: user.is_premium ?? false
    }
  });
});

/* === START === */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server started on port", PORT);
});
