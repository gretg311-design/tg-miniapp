import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const BOT_TOKEN = process.env.BOT_TOKEN;

// проверка подписи Telegram
function checkTelegramAuth(initData) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");

  const dataCheckString = [...urlParams.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHash("sha256")
    .update(BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return calculatedHash === hash;
}

app.post("/auth", (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({ ok: false, error: "No initData" });
  }

  const isValid = checkTelegramAuth(initData);

  if (!isValid) {
    return res.status(403).json({ ok: false, error: "Invalid signature" });
  }

  const data = Object.fromEntries(new URLSearchParams(initData));
  const user = JSON.parse(data.user);

  res.json({
    ok: true,
    user
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
