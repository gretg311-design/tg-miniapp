require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const app = express();
app.use(express.json());

const OWNER_ID = 8287041036;

mongoose.connect(process.env.MONGO_URI);

const UserSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    gender: String, // Парень или Девушка
    shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    sub_expire: Date,
    streak: { type: Number, default: 0 },
    last_daily: Date
});
const User = mongoose.model('User', UserSchema);

// Авторизация + выбор пола
app.post('/api/auth', async (req, res) => {
    const { tg_id, gender } = req.body;
    let user = await User.findOne({ tg_id });
    if (!user) {
        user = await User.create({ tg_id, gender, shards: 100 });
    }
    // Овнеру всегда безлимит (логика на фронте и бэке)
    if (tg_id === OWNER_ID) {
        user.shards = 999999;
        user.sub = 'Ultra';
    }
    res.json(user);
});

// Ежедневка (Твои цифры: 50, 100, 250, 500 + x2 за 7 дней)
app.post('/api/daily', async (req, res) => {
    const { tg_id } = req.body;
    const user = await User.findOne({ tg_id });
    let reward = 15; // Базовая
    if (user.sub === 'Premium') reward = 50;
    else if (user.sub === 'Pro') reward = 100;
    else if (user.sub === 'VIP') reward = 250;
    else if (user.sub === 'Ultra') reward = 500;

    if (user.streak >= 7) reward *= 2;

    user.shards += reward;
    user.last_daily = new Date();
    await user.save();
    res.json({ new_balance: user.shards });
});

module.exports = app;
