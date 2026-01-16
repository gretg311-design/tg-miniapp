const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Проверяем, что видит сервер в реальности
const MONGO_URL = process.env.MONGO_URL;

console.log("--- ПРОВЕРКА ОКРУЖЕНИЯ ---");
if (!MONGO_URL) {
    console.log("❌ КРИТИЧЕСКАЯ ОШИБКА: Переменная MONGO_URL пустая (undefined)!");
    console.log("Совет: Проверь вкладку Variables в Railway и нажми Redeploy.");
} else {
    console.log("✅ MONGO_URL обнаружена, пытаюсь подключиться...");
    
    mongoose.connect(MONGO_URL)
        .then(() => console.log('🌙 СИСТЕМА ГОТОВА: База Осколков Луны подключена'))
        .catch(err => console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ К МОНГО:', err.message));
}

// Модель игрока (все правила про x2 бонусы и подписки)
const UserSchema = new mongoose.Schema({
    tgId: { type: Number, unique: true },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'None' },
    lastDaily: { type: Date, default: new Date(0) },
    streak: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

const REWARDS = { 'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500, 'None': 20 };

app.post('/api/daily', async (req, res) => {
    try {
        const { tgId } = req.body;
        let user = await User.findOne({ tgId });
        if (!user) user = await User.create({ tgId });

        const now = new Date();
        const diff = (now - user.lastDaily) / (1000 * 60 * 60);

        if (diff < 24) return res.json({ success: false, msg: `Приходи через ${Math.ceil(24 - diff)}ч.` });

        user.streak = (diff < 48) ? user.streak + 1 : 1;
        let reward = REWARDS[user.subscription] || 20;

        // Твое правило x2 на 7-й день
        if (user.streak >= 7 && user.subscription !== 'None') reward *= 2;

        user.balance += reward;
        user.lastDaily = now;
        await user.save();
        res.json({ success: true, reward, balance: user.balance });
    } catch (e) {
        res.json({ success: false, msg: "База данных недоступна" });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`);
});
