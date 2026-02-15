const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

app.use(express.json());
app.use(require('cors')());
app.use(express.static(path.join(__dirname, 'public')));

// ПРЯМАЯ ССЫЛКА (Я поменял адрес на Pooler, он надежнее)
const connectionString = "postgresql://postgres.mvzuegcsrqzdibtmzcus:MoonAdmin2026@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

const pool = new Pool({ connectionString });

app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        // Просто проверяем, отвечает ли база
        const result = await pool.query('SELECT NOW()'); 
        
        let userData = {
            tg_id: tid,
            name: req.body.name || "User",
            moon_shards: tid === 8287041036 ? 999999999 : 100,
            role: tid === 8287041036 ? 'owner' : 'user'
        };

        res.json(userData);
    } catch (e) {
        res.status(500).json({ error: "DB_ERROR", message: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(3000);
module.exports = app;
