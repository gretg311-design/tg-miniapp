const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Ссылка берется из Variables Railway
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    console.log("❌ ОШИБКА: Переменная MONGO_URL не видна серверу!");
} else {
    mongoose.connect(MONGO_URL)
        .then(() => console.log('🌙 База Осколков Луны подключена успешно'))
        .catch(err => console.error('❌ Ошибка MongoDB:', err.message));
}

// Схема по твоим правилам
const UserSchema = new mongoose.Schema({
    tgId: { type: Number, unique: true },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'None' }, // Premium, Pro, VIP, Ultra
    lastDaily: { type: Date, default: new Date(0) },
    streak: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// Награды по твоему списку
const REWARDS = {
    'Premium': 50,
    'Pro': 100,
    'VIP': 250,
    'Ultra': 500,
    'None': 20
};

app.post('/api/daily', async (req, res) => {
    try {
        const { tgId } = req.body;
        let user = await User.findOne({ tgId });
        if (!user) user = await User.create({ tgId });

        const now = new Date();
        const diffHours = (now - user.lastDaily) / (1000 * 60 * 60);

        if (diffHours < 24) {
            return res.json({ success: false, msg: `Жди еще ${Math.ceil(24 - diffHours)}ч.` });
        }

        // Стрик сбрасывается, если пропустил больше 48 часов
        user.streak = (diffHours < 48) ? user.streak + 1 : 1;

        let reward = REWARDS[user.subscription] || REWARDS['None'];

        // Твое правило: x2 бонус за 7 дней для всех платных подписок
        if (user.streak >= 7 && user.subscription !== 'None') {
            reward *= 2;
        }

        user.balance += reward;
        user.lastDaily = now;
        await user.save();

        res.json({ success: true, reward, streak: user.streak, balance: user.balance });
    } catch (e) {
        res.json({ success: false, msg: "Ошибка системы наград" });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Сервер на порту ${PORT}`));
