const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Подключение к БД через переменную Railway
const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL)
    .then(() => console.log('🌙 База Осколков Луны подключена'))
    .catch(err => console.error('❌ Ошибка базы:', err));

// Схема пользователя (по твоим правилам)
const UserSchema = new mongoose.Schema({
    tgId: { type: Number, unique: true, required: true },
    role: { type: String, default: 'user' }, // owner, admin, user
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'None' },
    subExpiry: { type: Date },
    lastDaily: { type: Date, default: new Date(0) },
    streak: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// Константы наград (из твоих закрепов)
const REWARDS = {
    'Premium': 50,
    'Pro': 100,
    'VIP': 250,
    'Ultra': 500,
    'None': 20
};

// --- ЕЖЕДНЕВНАЯ НАГРАДА (ЗАЩИТА ОТ НАКРУТОК) ---
app.post('/api/daily', async (req, res) => {
    const { tgId } = req.body;
    const user = await User.findOne({ tgId });
    if (!user) return res.status(404).json({ msg: 'Юзер не найден' });

    const now = new Date();
    const diffHours = (now - user.lastDaily) / (1000 * 60 * 60);

    if (diffHours < 24) {
        return res.json({ success: false, msg: `Вернись через ${Math.ceil(24 - diffHours)}ч.` });
    }

    // Логика стрика (сброс если пропустил более 48ч)
    user.streak = (diffHours < 48) ? user.streak + 1 : 1;

    let reward = REWARDS[user.subscription] || REWARDS['None'];
    
    // Бонус x2 за 7 дней (для всех платных сабов по твоему закрепу)
    if (user.streak >= 7 && user.subscription !== 'None') {
        reward *= 2;
    }

    user.balance += reward;
    user.lastDaily = now;
    await user.save();

    res.json({ success: true, reward, streak: user.streak, balance: user.balance });
});

// --- АДМИНКА (ТОЛЬКО ПО TG ID) ---
app.post('/api/admin/action', async (req, res) => {
    const { adminId, targetId, action, amount, subType } = req.body;
    const adminUser = await User.findOne({ tgId: adminId });

    if (!adminUser || (adminUser.role !== 'owner' && adminUser.role !== 'admin')) {
        return res.status(403).json({ msg: 'Доступ запрещен' });
    }

    const target = await User.findOne({ tgId: targetId });
    if (!target) return res.status(404).json({ msg: 'Цель не найдена' });

    if (action === 'give_shards') {
        target.balance += parseInt(amount);
    } else if (action === 'set_sub') {
        target.subscription = subType;
        target.subExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
    }

    await target.save();
    res.json({ success: true });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));
