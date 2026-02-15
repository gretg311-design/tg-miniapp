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

// Подключение к Supabase Postgres
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Инициализация таблицы при запуске
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
        console.log("✅ Таблица в Supabase готова");
    } catch (err) {
        console.error("❌ Ошибка инициализации таблицы:", err.message);
    }
};
initDB();

app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        const name = req.body.name || "User";

        // Проверяем/создаем юзера одной командой (UPSERT)
        const query = `
            INSERT INTO users (tg_id, name)
            VALUES ($1, $2)
            ON CONFLICT (tg_id) DO UPDATE SET name = $2
            RETURNING *
        `;
        const result = await pool.query(query, [tid, name]);
        let user = result.rows[0];

        // Жесткая проверка на Овнера
        if (Number(tid) === OWNER_ID) {
            const ownerResult = await pool.query(
                "UPDATE users SET role = 'owner', moon_shards = 999999999, sub = 'Ultra' WHERE tg_id = $1 RETURNING *",
                [tid]
            );
            user = ownerResult.rows[0];
        }

        // Приводим типы к числу для фронтенда
        res.json({
            ...user,
            tg_id: Number(user.tg_id),
            moon_shards: Number(user.moon_shards)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка Supabase: " + e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;
