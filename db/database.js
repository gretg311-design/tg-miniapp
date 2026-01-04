import Database from "better-sqlite3";

const db = new Database("users.db");

// === USERS TABLE ===
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE,
    username TEXT,
    role TEXT DEFAULT 'user',           -- user | admin | owner
    subscription TEXT DEFAULT 'free',   -- free | premium | pro | vip | ultra
    subscription_until INTEGER,
    moon_shards INTEGER DEFAULT 50,
    daily_streak INTEGER DEFAULT 0,
    last_daily_claim INTEGER,
    created_at INTEGER
  )
`).run();

export default db;
