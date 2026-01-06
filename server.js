import express from "express";
import crypto from "crypto";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const OWNER_ID = 8287041036;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static("public"));

function checkTelegram(initData) {
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

await db.query(`
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  balance INT DEFAULT 50,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS completed_tasks (
  user_id BIGINT,
  task_id TEXT,
  PRIMARY KEY (user_id, task_id)
);
`);

app.post("/api/init", async (req, res) => {
  const { initData } = req.body;
  if (!checkTelegram(initData)) {
    return res.status(403).json({ error: "AUTH_FAILED" });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user"));

  const role = user.id === OWNER_ID ? "owner" : "user";

  await db.query(
    `INSERT INTO users (id, role)
     VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [user.id, role]
  );

  const result = await db.query("SELECT * FROM users WHERE id=$1", [user.id]);

  res.json({ ok: true, user: result.rows[0] });
});

app.post("/api/task/subscribe", async (req, res) => {
  const { userId } = req.body;

  const exists = await db.query(
    "SELECT 1 FROM completed_tasks WHERE user_id=$1 AND task_id='sub'",
    [userId]
  );

  if (exists.rowCount) {
    return res.json({ error: "ALREADY_DONE" });
  }

  await db.query(
    "UPDATE users SET balance = balance + 50 WHERE id=$1",
    [userId]
  );

  await db.query(
    "INSERT INTO completed_tasks VALUES ($1, 'sub')",
    [userId]
  );

  res.json({ ok: true, reward: 50 });
});

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server running on", PORT);
});
