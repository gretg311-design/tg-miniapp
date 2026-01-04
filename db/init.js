import pkg from "pg";
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Database ready");
}

export default pool;
