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

// ПРЯМОЕ ПОДКЛЮЧЕНИЕ (Убрали точку в логине, вернули порт 5432)
const connectionString = "postgresql://postgres:MoonAdmin2026@db.mvzuegcsrqzdibtmzcus.supabase.co:5432/postgres";

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

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
        console.log("✅ DB Ready");
    } catch (err) {
        console.error("❌ DB Error:", err.message);
    }
};
initDB();

app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        const name = req.body.name || "User";
        if (!tid) return res.status(400).json({ error: "No ID" });

        const query = `
            INSERT INTO users (tg_id, name)
            VALUES ($1, $2)
            ON CONFLICT (tg_id) DO UPDATE SET name = $2
            RETURNING *
        `;
        const result = await pool.query(query, [tid, name]);
        let user = result.rows[0];

        if (Number(tid) === OWNER_ID) {
            const ownerUpdate = await pool.query(
                "UPDATE users SET role = 'owner', moon_shards = 999999999, sub = 'Ultra' WHERE tg_id = $1 RETURNING *",
                [tid]
            );
            user = ownerUpdate.rows[0];
        }

        res.json({
            ...user,
            tg_id: Number(user.tg_id),
            moon_shards: Number(user.moon_shards)
        });
    } catch (e) {
        res.status(500).json({ error: "DB_ERROR", message: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Run on ${PORT}`));

module.exports = app;
