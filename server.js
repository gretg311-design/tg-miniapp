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

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id BIGINT PRIMARY KEY
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        telegram_id BIGINT PRIMARY KEY
      );
    `);

    console.log("✅ Database ready");
  } catch (e) {
    console.error("❌ DB error", e);
  }
})();

/* ---------- MIDDLEWARE ---------- */
app.use(express.json());
app.use(express.static("public"));

/* ---------- CHECK ACCESS ---------- */
app.get("/access/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const blocked = await pool.query(
      "SELECT telegram_id FROM blocked_users WHERE telegram_id = $1",
      [id]
    );

    if (blocked.rows.length > 0) {
      return res.json({ access: false });
    }

    await pool.query(
      `INSERT INTO users (telegram_id)
       VALUES ($1)
       ON CONFLICT (telegram_id) DO NOTHING`,
      [id]
    );

    res.json({ access: true });
  } catch (err) {
    console.error("❌ Access error", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- ADMIN BLOCK USER ---------- */
/* временно, для теста */
app.post("/block", async (req, res) => {
  const { telegram_id } = req.body;

  if (!telegram_id) {
    return res.status(400).json({ error: "No telegram_id" });
  }

  await pool.query(
    `INSERT INTO blocked_users (telegram_id)
     VALUES ($1)
     ON CONFLICT DO NOTHING`,
    [telegram_id]
  );

  res.json({ blocked: true });
});

/* ---------- START ---------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
