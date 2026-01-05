import express from "express";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 10000;

/* ---------- DATABASE ---------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool
  .query(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id BIGINT PRIMARY KEY
    );
  `)
  .then(() => console.log("✅ Database ready"))
  .catch(err => console.error("❌ DB error", err));

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());
app.use(express.static("public"));

/* ---------- API ---------- */
app.post("/user", async (req, res) => {
  try {
    const { telegram_id } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ error: "No telegram_id" });
    }

    await pool.query(
      `INSERT INTO users (telegram_id)
       VALUES ($1)
       ON CONFLICT (telegram_id) DO NOTHING`,
      [telegram_id]
    );

    res.json({ ok: true, telegram_id });
  } catch (err) {
    console.error("❌ Insert error", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- START ---------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
