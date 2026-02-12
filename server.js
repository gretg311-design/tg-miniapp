require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path'); // 1. Добавили путь
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 2. ЭТО РЕШАЕТ ПРОБЛЕМУ "Cannot GET /"
// Мы говорим серверу: "Все файлы бери из папки public"
app.use(express.static(path.join(__dirname, 'public')));

// 3. Если зашли на главную - отдай index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const OWNER_ID = 8287041036;

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
}).catch(err => console.log("DB ERROR: ", err.message));

// Твои закрепленные правила
app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, gender } = req.body;
        // Тут твоя логика овнера и подписок...
        res.json({ ok: true, owner: tg_id === OWNER_ID });
    } catch (e) { res.status(500).send(e.message); }
});

module.exports = app;
