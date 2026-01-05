import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 3000;

/* =======================
   DATABASE
======================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      first_name TEXT,
      username TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Database ready");
}

initDB().catch(console.error);

/* =======================
   MIDDLEWARE
======================= */

app.use(express.json());
app.use(express.static("public"));

/* =======================
   ROUTES
======================= */

app.get("/health", (req, res) => {
  res.send("OK");
});

app.post("/user", async (req, res) => {
  const { telegram_id, first_name, username } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO users (telegram_id, first_name, username)
      VALUES ($1, $2, $3)
      ON CONFLICT (telegram_id) DO NOTHING
      `,
      [telegram_id, first_name, username]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "db error" });
  }
});

/* =======================
   START
======================= */

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
