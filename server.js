import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

console.log("🔥 SERVER START");
console.log("BOT_TOKEN exists:", !!BOT_TOKEN);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function checkTelegramAuth(initData) {
  const secretKey = crypto
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
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return hmac === hash;
}

app.post("/api/auth", (req, res) => {
  console.log("➡️ /api/auth called");

  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ ok: false, error: "NO_INIT_DATA" });
    }

    const valid = checkTelegramAuth(initData);
    if (!valid) {
      return res.status(403).json({ ok: false, error: "INVALID_AUTH" });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user"));

    return res.json({
      ok: true,
      user_id: user.id
    });
  } catch (e) {
    console.error("❌ AUTH ERROR:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
