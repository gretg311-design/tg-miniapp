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

// ПРЯМОЕ ПОДКЛЮЧЕНИЕ ЧЕРЕЗ ТВОЮ ССЫЛКУ (с портом 6543 для надежности)
const connectionString = "postgresql://postgres:MoonAdmin2026@db.mvzuegcsrqzdibtmzcus.supabase.co:6543/postgres?sslmode=require";

const pool = new Pool({
    connectionString: connectionString,
    connectionTimeoutMillis: 10000,
});

// Создание таблицы
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
        console.log("✅ DB Connected & Table Ready");
    } catch (err) {
        console.error("❌ DB Init Error:", err.message);
    }
};
initDB();

app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        const name = req.body.name || "User";

        // Поиск или создание пользователя
        const query = `
            INSERT INTO users (tg_id, name)
            VALUES ($1, $2)
            ON CONFLICT (tg_id) DO UPDATE SET name = $2
            RETURNING *
        `;
        const result = await pool.query(query, [tid, name]);
        let user = result.rows[0];

        // Авто-выдача прав тебе как Овнеру
        if (Number(tid) === OWNER_ID) {
            const ownerUpdate = await pool.query(
                "UPDATE users SET role = 'owner', moon_shards = 999999999, sub = 'Ultra' WHERE tg_id = $1 RETURNING *",
                [tid]
            );
            user = ownerUpdate.rows[0];
        }

        // Возвращаем данные (числа приводим из BigInt в Number)
        res.json({
            ...user,
            tg_id: Number(user.tg_id),
            moon_shards: Number(user.moon_shards)
        });
    } catch (e) {
        res.status(500).json({ error: "DB Error", message: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;
