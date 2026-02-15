require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;

// ФОРМАТ ДЛЯ SUPABASE POOLER (ПОРТ 6543)
// Логин должен быть: postgres.mvzuegcsrqzdibtmzcus
const connectionString = "postgresql://postgres.mvzuegcsrqzdibtmzcus:MoonAdmin2026@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// Автоматическое создание таблицы при запуске
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                tg_id BIGINT PRIMARY KEY,
                name TEXT,
                moon_shards BIGINT DEFAULT 100,
                sub TEXT DEFAULT 'free',
                role TEXT DEFAULT 'user'
            )
        `);
        console.log("✅ База данных Supabase готова к работе");
    } catch (err) {
        console.error("❌ Ошибка при инициализации:", err.message);
    }
};
initDB();

app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        const name = req.body.name || "User";

        if (!tid) return res.status(400).json({ error: "No TG ID" });

        // Пытаемся найти или создать пользователя
        const upsertQuery = `
            INSERT INTO users (tg_id, name)
            VALUES ($1, $2)
            ON CONFLICT (tg_id) DO UPDATE SET name = $2
            RETURNING *
        `;
        const result = await pool.query(upsertQuery, [tid, name]);
        let user = result.rows[0];

        // Проверка на овнера (твой ID)
        if (Number(tid) === OWNER_ID) {
            const ownerUpdate = await pool.query(
                "UPDATE users SET role = 'owner', moon_shards = 999999999, sub = 'Ultra' WHERE tg_id = $1 RETURNING *",
                [tid]
            );
            user = ownerUpdate.rows[0];
        }

        // Отправляем данные фронтенду
        res.json({
            ...user,
            tg_id: Number(user.tg_id),
            moon_shards: Number(user.moon_shards)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "DB_ERROR", message: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
