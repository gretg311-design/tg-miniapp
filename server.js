import express from "express";
import crypto from "crypto";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

app.use(express.json());
app.use(express.static("public"));

const DB_PATH = "./db/users.json";

/* ===== helpers ===== */

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function checkTelegramAuth(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = crypto
    .createHash("sha256")
    .update(BOT_TOKEN)
    .digest();

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  return hmac === hash;
}

/* ===== API ===== */

app.post("/api/profile", (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.json({ ok: false });

  if (!checkTelegramAuth(initData)) {
    return res.json({ ok: false });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));

  const db = loadDB();

  if (!db[user.id]) {
    db[user.id] = {
      id: user.id,
      username: user.username || null,
      role: "user",
      shards: 50,
      subscription: {
        type: "free",
        until: null
      }
    };
    saveDB(db);
  }

  res.json({ ok: true, profile: db[user.id] });
});

app.get("/health", (_, res) => res.send("OK"));

app.listen(PORT, () =>
  console.log("Server running on", PORT)
);
