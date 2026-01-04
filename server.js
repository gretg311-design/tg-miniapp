import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

// ES modules fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static("public"));

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

// ✅ API — СТРОГО ВЫШЕ fallback
app.post("/api/auth", (req, res) => {
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

  res.json({
    ok: true,
    user
  });
});

// ⚠️ fallback — ТОЛЬКО ПОСЛЕ API
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
