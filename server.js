require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// Твой ID и настройки цен
const OWNER_ID = "8287041036";
const CRYPTO_BOT_TOKEN = process.env.CRYPTO_BOT_TOKEN;

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
    tgId: String,
    name: String,
    gender: String,
    shards: { type: Number, default: 10 },
    subscription: { type: String, default: 'free' },
    subEndDate: Date,
    streak: { type: Number, default: 0 },
    lastCheckIn: Date,
    settings: { vulgarity: { type: Number, default: 1 }, msgLength: { type: Number, default: 45 } }
});

const User = mongoose.model('User', userSchema);

// Проверка пользователя при входе
app.get('/api/get-user', async (req, res) => {
    const { tgId } = req.query;
    if (tgId === OWNER_ID) {
        return res.json({ exists: true, user: { name: "Овнер", shards: "∞", subscription: "Бесконечная" } });
    }
    const user = await User.findOne({ tgId });
    res.json({ exists: !!user, user });
});

// Отправка сообщения (1 сообщение = 1 осколок)
app.post('/api/chat', async (req, res) => {
    const { tgId, text } = req.body;
    
    if (tgId === OWNER_ID) {
        return res.json({ text: "Слушаю, босс. Лимиты отключены.", shardsLeft: "∞" });
    }

    const user = await User.findOne({ tgId });
    if (!user || user.shards < 1) return res.status(403).json({ error: "Нет осколков" });

    user.shards -= 1;
    await user.save();
    res.json({ text: "Ответ ИИ...", shardsLeft: user.shards });
});

// Оплата через Crypto Bot (TON / USDT)
app.post('/api/pay', async (req, res) => {
    const { amount, asset } = req.body;
    try {
        const response = await axios.post('https://pay.crypt.bot/api/createInvoice', {
            asset, amount, description: "Пополнение баланса"
        }, { headers: { 'Crypto-Pay-API-Token': CRYPTO_BOT_TOKEN } });
        res.json(response.data.result);
    } catch (e) { res.status(500).send(e.message); }
});

module.exports = app;
