const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Берем переменную из настроек Railway
const MONGO_URL = process.env.MONGO_URL;

// Подключение с расширенными настройками стабильности
mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log('🌙 СИСТЕМА ГOТОВА: База подключена'))
.catch(err => console.error('❌ Ошибка MongoDB:', err.message));

// Схема пользователя по твоим правилам проекта "от А до Я"
const UserSchema = new mongoose.Schema({
    tgId: { type: Number, unique: true },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'None' },
    lastDaily: { type: Date, default: new Date(0) },
    streak: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// Награды по твоим закрепам
const REWARDS = { 'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500, 'None': 20 };

// Роут для проверки жизнеспособности (чтобы Railway не выключал сервер)
app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/api/daily', async (req, res) => {
    try {
        const { tgId } = req.body;
        if (!tgId) return res.json({ success: false, msg: "Нет ID" });

        let user = await User.findOne({ tgId });
        if (!user) user = await User.create({ tgId });

        const now = new Date();
        const diff = (now - user.lastDaily) / (1000 * 60 * 60);

        if (diff < 24) return res.json({ success: false, msg: `Жди еще ${Math.ceil(24 - diff)}ч.` });

        user.streak = (diff < 48) ? user.streak + 1 : 1;
        let reward = REWARDS[user.subscription] || 20;

        // Твое правило: x2 бонус за 7 дней
        if (user.streak >= 7 && user.subscription !== 'None') reward *= 2;

        user.balance += reward;
        user.lastDaily = now;
        await user.save();
        res.json({ success: true, reward, balance: user.balance });
    } catch (e) {
        res.json({ success: false, msg: "Ошибка базы" });
    }
});

// Слушаем на 0.0.0.0 — это КРИТИЧНО для Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`);
});
