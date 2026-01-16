const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const { MONGO_URL, OWNER_ID, OPENROUTER_API_KEY } = process.env;

mongoose.connect(MONGO_URL).then(() => console.log('🌙 БД ПОДКЛЮЧЕНА'));

// СХЕМА ЮЗЕРА (Все твои правила по подпискам и бонусам тут)
const UserSchema = new mongoose.Schema({
    tgId: { type: Number, unique: true },
    name: String,
    gender: { type: String, default: "Мужской" },
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'None' },
    subExpiry: { type: Date },
    lastDaily: { type: Date, default: new Date(0) },
    streak: { type: Number, default: 0 },
    settings: {
        msgLength: { type: Number, default: 45 },
        lewdness: { type: String, default: 'Минимум' }
    }
});
const User = mongoose.model('User', UserSchema);

// ВХОД / РЕГИСТРАЦИЯ
app.post('/api/auth', async (req, res) => {
    const { tgId, name, gender } = req.body;
    let user = await User.findOne({ tgId });
    
    if (!user) {
        const isOwner = (tgId == OWNER_ID);
        user = await User.create({
            tgId, 
            name: name || "Странник", 
            gender: gender || "Мужской",
            role: isOwner ? 'owner' : 'user',
            balance: isOwner ? 999999 : 100,
            subscription: isOwner ? 'Ultra' : 'Ultra', // Новичкам Ultra на 7 дней
            subExpiry: isOwner ? new Date(2099, 0, 1) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
    }
    res.json(user);
});

// ЕЖЕДНЕВНЫЙ БОНУС (x2 на 7 день)
app.post('/api/daily', async (req, res) => {
    const { tgId } = req.body;
    const user = await User.findOne({ tgId });
    const now = new Date();
    const diff = (now - user.lastDaily) / (1000 * 60 * 60);

    if (diff < 24) return res.json({ success: false, msg: `Приходи через ${Math.ceil(24 - diff)}ч.` });

    user.streak = (diff < 48) ? user.streak + 1 : 1;
    
    const rewards = { 'None': 20, 'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500 };
    let reward = rewards[user.subscription] || 20;
    
    if (user.streak >= 7) reward *= 2; // Твое правило x2 бонуса

    user.balance += reward;
    user.lastDaily = now;
    await user.save();
    res.json({ success: true, reward, balance: user.balance, streak: user.streak });
});

app.listen(process.env.PORT || 8080, '0.0.0.0');
