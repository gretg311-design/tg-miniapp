const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Переменные из Railway
const { MONGO_URL, OWNER_ID, OPENROUTER_API_KEY, PORT = 8080 } = process.env;

// Подключение к БД
mongoose.connect(MONGO_URL)
    .then(() => console.log('🌙 БД ПОДКЛЮЧЕНА УСПЕШНО'))
    .catch(err => console.error('❌ ОШИБКА БД:', err));

// Схема пользователя по твоим правилам
const UserSchema = new mongoose.Schema({
    tgId: { type: Number, unique: true, required: true },
    name: String,
    gender: { type: String, default: "Мужской" },
    role: { type: String, default: 'user' }, // owner, admin, user
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

// --- API ЭНДПОИНТЫ ---

// 1. Вход и Регистрация (Твой запрос: вход без повторной капчи)
app.post('/api/auth', async (req, res) => {
    try {
        const { tgId, name, gender } = req.body;
        let user = await User.findOne({ tgId });

        if (!user) {
            // Если заходит OWNER_ID, даем права бога
            const isOwner = (tgId == OWNER_ID);
            user = await User.create({
                tgId,
                name: name || "Странник",
                gender: gender || "Мужской",
                role: isOwner ? 'owner' : 'user',
                balance: isOwner ? 999999 : 100,
                subscription: isOwner ? 'Ultra' : 'None',
                subExpiry: isOwner ? new Date(2099, 0, 1) : null
            });
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Ежедневный бонус (Твое правило: x2 на 7-й день)
app.post('/api/daily', async (req, res) => {
    const { tgId } = req.body;
    const user = await User.findOne({ tgId });
    if (!user) return res.status(404).send('User not found');

    const now = new Date();
    const last = new Date(user.lastDaily);
    const hoursSince = (now - last) / (1000 * 60 * 60);

    if (hoursSince < 24) {
        return res.json({ success: false, msg: `Бонус будет доступен через ${Math.ceil(24 - hoursSince)}ч.` });
    }

    // Проверка стрейка
    if (hoursSince < 48) {
        user.streak += 1;
    } else {
        user.streak = 1;
    }

    // Твои награды: Premium 50, Pro 100, VIP 250, Ultra 500
    const rewards = { 'None': 20, 'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500 };
    let reward = rewards[user.subscription] || 20;

    // x2 бонус если стрейк 7 дней
    if (user.streak >= 7) {
        reward *= 2;
    }

    user.balance += reward;
    user.lastDaily = now;
    await user.save();

    res.json({ success: true, reward, balance: user.balance, streak: user.streak });
});

// 3. Админ-команда: Выдача баланса/подписки ТОЛЬКО по TG ID
app.post('/api/admin/give', async (req, res) => {
    const { adminId, targetId, type, amount, subType } = req.body;
    const admin = await User.findOne({ tgId: adminId });

    if (!admin || (admin.role !== 'admin' && admin.role !== 'owner')) {
        return res.status(403).json({ error: 'Нет доступа' });
    }

    const target = await User.findOne({ tgId: targetId });
    if (!target) return res.json({ error: 'Пользователь не найден' });

    if (type === 'shards') target.balance += parseInt(amount);
    if (type === 'sub') {
        target.subscription = subType;
        target.subExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Строго 30 дней
    }

    await target.save();
    res.json({ success: true });
});

// Запуск сервера на 0.0.0.0 для Railway
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ЛУНА ЗАПУЩЕНА НА ПОРТУ ${PORT}`);
});
