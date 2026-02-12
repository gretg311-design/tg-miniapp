require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const OWNER_ID = 8287041036;

// Подключение к базе (Убедись, что в MongoDB стоит IP 0.0.0.0/0)
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
}).catch(err => console.error("Ошибка базы:", err.message));

const UserSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    gender: String,
    shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    streak: { type: Number, default: 0 },
    last_daily: Date
});
const User = mongoose.model('User', UserSchema);

// Авторизация
app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, gender } = req.body;
        if (!tg_id) return res.status(400).send("No ID");

        let user = await User.findOne({ tg_id });
        if (!user) {
            user = await User.create({ tg_id, gender: gender || 'Парень', shards: 100 });
        }

        // Логика Овнера (Закреплено)
        if (tg_id === OWNER_ID) {
            user.shards = 999999999; 
            user.sub = 'Ultra';
        }

        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Ежедневка (Premium-50, Pro-100, VIP-250, Ultra-500 + стрик x2)
app.post('/api/daily', async (req, res) => {
    const { tg_id } = req.body;
    const user = await User.findOne({ tg_id });
    if (!user) return res.status(404).send();

    let reward = 15; // Обычный юзер
    if (user.sub === 'Premium') reward = 50;
    else if (user.sub === 'Pro') reward = 100;
    else if (user.sub === 'VIP') reward = 250;
    else if (user.sub === 'Ultra') reward = 500;

    if (user.streak >= 7) reward *= 2; // Бонус за стрик

    user.shards += reward;
    user.last_daily = new Date();
    await user.save();
    res.json({ shards: user.shards });
});

module.exports = app;
