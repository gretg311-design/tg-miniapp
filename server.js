const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

const { MONGO_URL, OWNER_ID } = process.env;

// Подключение к БД (без await снаружи, чтобы не тормозить запуск)
mongoose.connect(MONGO_URL).then(() => console.log('🌙 DB Connected'));

const UserSchema = new mongoose.Schema({
    tgId: Number,
    name: String,
    gender: { type: String, default: 'Мужской' },
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' },
    streak: { type: Number, default: 0 },
    lengthOffset: { type: Number, default: 50 }
});
const User = mongoose.model('User', UserSchema);

// API: Авторизация
app.post('/api/auth', async (req, res) => {
    const { tgId } = req.body;
    let user = await User.findOne({ tgId });
    if (!user) return res.json({ isNew: true });
    
    if (String(tgId) === String(OWNER_ID)) {
        user.role = 'owner';
        user.subscription = 'Ultra';
        await user.save();
    }
    res.json(user);
});

// API: Регистрация
app.post('/api/register', async (req, res) => {
    const { tgId, name, gender } = req.body;
    const user = await User.create({
        tgId, name, gender,
        role: (String(tgId) === String(OWNER_ID)) ? 'owner' : 'user'
    });
    res.json(user);
});

// API: Настройки
app.post('/api/update-settings', async (req, res) => {
    const { tgId, name, gender, lengthOffset } = req.body;
    const user = await User.findOneAndUpdate({ tgId }, { name, gender, lengthOffset }, { new: true });
    res.json(user);
});

// Экспорт для Vercel
module.exports = app;

// Обычный запуск для локальных тестов
if (require.main === module) {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`🚀 Alive on ${PORT}`));
}
