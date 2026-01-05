import express from "express";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Проверка БД
pool.query("SELECT 1")
  .then(() => console.log("✅ Database ready"))
  .catch(err => console.error("❌ DB error", err));

// Главная
app.get("/", (req, res) => {
  res.send("Mini App API работает");
});

// Сохранение пользователя (ТОЛЬКО ID)
app.post("/user", async (req, res) => {
  try {
    const { telegram_id } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ error: "telegram_id required" });
    }

    await pool.query(
      "INSERT INTO users (telegram_id) VALUES ($1) ON CONFLICT DO NOTHING",
      [telegram_id]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error("DB ERROR:", e);
    res.status(500).json({ error: "db error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
