require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const OWNER_ID = 8287041036;

// Логируем попытку подключения
console.log("Попытка подключения к MongoDB...");

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
}).then(() => {
    console.log("✅ База данных подключена успешно");
}).catch(err => {
    console.error("❌ Ошибка подключения к базе:", err.message);
});

const UserSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: String,
    gender: String,
    shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    streak: { type: Number, default: 0 },
    last_daily: Date
});
const User = mongoose.model('User', UserSchema);

// Регистрация
app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, name, gender } = req.body;
        if (!tg_id) return res.status(400).json({ error: "Нет ID" });

        let user = await User.findOne({ tg_id });
        if (!user) {
            user = await User.create({ tg_id, name, gender, shards: 100 });
        }
        res.json(user);
    } catch (e) {
        console.error("Ошибка в /api/auth:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Ежедневка и остальные роуты...
// (оставь их как в прошлом сообщении)

module.exports = app;
