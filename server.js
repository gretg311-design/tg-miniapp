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

// 🔐 AUTH API
app.post("/api/auth", (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ ok: false, error: "NO_INIT_DATA" });
    }

    if (!checkTelegramAuth(initData)) {
      return res.status(403).json({ ok: false, error: "INVALID_AUTH" });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user"));

    // 🔥 ВАЖНО: отдаем ВСЕ, что ждёт интерфейс
    return res.json({
      ok: true,
      userId: user.id,
      balance: 50,              // стартовые лунные осколки
      subscription: "Free",     // пока Free
      isAdmin: false            // позже из БД
    });

  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
