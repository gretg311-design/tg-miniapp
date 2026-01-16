const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// ВАЖНО: Проверь, что в Railway Variables имя переменной именно MONGO_URL
const MONGO_URL = process.env.MONGO_URL;

mongoose.connect(MONGO_URL)
    .then(() => console.log('🌙 База Осколков Луны подключена успешно'))
    .catch(err => console.error('⚠️ ОШИБКА БАЗЫ: Проверь MONGO_URL в Railway!', err.message));

const UserSchema = new mongoose.Schema({
    tgId: { type: Number, unique: true },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'None' },
    lastDaily: { type: Date, default: new Date(0) },
    streak: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// Награды по твоим правилам
const REWARDS = { 
    'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500, 'None': 20 
};

app.post('/api/daily', async (req, res) => {
    try {
        const { tgId } = req.body;
        let user = await User.findOne({ tgId });
        if (!user) user = await User.create({ tgId });

        const now = new Date();
        const diff = (now - user.lastDaily) / (1000 * 60 * 60);

        if (diff < 24) return res.json({ success: false, msg: `Жди еще ${Math.ceil(24 - diff)}ч.` });

        user.streak = (diff < 48) ? user.streak + 1 : 1;
        let reward = REWARDS[user.subscription] || 20;

        // x2 за 7 дней (для всех платных подписок)
        if (user.streak >= 7 && user.subscription !== 'None') reward *= 2;

        user.balance += reward;
        user.lastDaily = now;
        await user.save();
        res.json({ success: true, reward, balance: user.balance });
    } catch (e) {
        res.json({ success: false, msg: "Ошибка подключения к Луне..." });
    }
});

app.listen(process.env.PORT || 8080, () => console.log('🚀 Сервер на связи!'));
