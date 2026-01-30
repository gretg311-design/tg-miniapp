require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const OWNER_ID = 8287041036;

mongoose.connect(process.env.MONGO_URI);

const UserSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: String,
    gender: String,
    shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' }, // free, premium, pro, vip, ultra
    sub_expire: Date,
    streak: { type: Number, default: 0 },
    last_daily: Date
});
const User = mongoose.model('User', UserSchema);

// Регистрация / Вход
app.post('/api/auth', async (req, res) => {
    const { tg_id, name, gender } = req.body;
    let user = await User.findOne({ tg_id });
    if (!user) {
        user = await User.create({ tg_id, name, gender, shards: 100 });
    }
    res.json(user);
});

// Ежедневка (15 база + бонусы подписок + стрик x2)
app.post('/api/daily', async (req, res) => {
    const { tg_id } = req.body;
    const user = await User.findOne({ tg_id });
    if (!user) return res.status(404).send();

    let reward = 15;
    if (user.sub === 'premium') reward += 10;
    else if (user.sub === 'pro') reward += 15;
    else if (user.sub === 'vip') reward += 25;
    else if (user.sub === 'ultra') reward += 35;

    if (user.streak >= 7) reward *= 2;

    user.shards += reward;
    user.last_daily = new Date();
    await user.save();
    res.json({ shards: user.shards });
});

// OpenRouter (1 соо = 1 осколок)
app.post('/api/chat', async (req, res) => {
    const { tg_id, message, char_id } = req.body;
    const user = await User.findOne({ tg_id });
    if (user.shards < 1) return res.status(403).json({ error: 'Нет осколков' });

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "google/gemini-2.0-flash-exp:free", // Твоя модель
            messages: [{ role: "user", content: message }]
        }, {
            headers: { "Authorization": `Bearer ${process.env.OPENROUTER_KEY}` }
        });

        user.shards -= 1;
        await user.save();
        res.json({ text: response.data.choices[0].message.content });
    } catch (e) { res.status(500).send(e.message); }
});

// CryptoBot (Инвойс)
app.post('/api/pay', async (req, res) => {
    const { amount, asset } = req.body; // 5 stars = 10 shards
    const response = await axios.post('https://pay.crypt.bot/api/createInvoice', {
        asset: asset, amount: amount
    }, { headers: { 'Crypto-Pay-API-Token': process.env.CRYPTO_BOT_TOKEN } });
    res.json(response.data);
});

module.exports = app;
