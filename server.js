import db from "./db/database.js";
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
app.use(express.static("public"));

function checkTelegramAuth(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // 🔥 ВАЖНО: правильный секрет
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return calculatedHash === hash;
}

app.post("/api/auth", (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.json({ ok: false, error: "NO_INIT_DATA" });
  }

  const valid = checkTelegramAuth(initData);
  if (!valid) {
    return res.json({ ok: false, error: "INVALID_HASH" });
  }

  const user = JSON.parse(
    new URLSearchParams(initData).get("user")
  );

  res.json({ ok: true, user });
});

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(PORT, () => {
  console.log("🚀 Server started on port", PORT);
});
