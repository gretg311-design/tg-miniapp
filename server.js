const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

// Подключение к твоей БД
mongoose.connect(MONGO_URI)
    .then(() => console.log('Успешное подключение к MongoDB'))
    .catch(err => console.error('Ошибка подключения к MongoDB:', err));

// Схема пользователя
const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    sub_expire: { type: Date, default: null },
    role: { type: String, default: "user" }
});

const User = mongoose.model('User', userSchema);

// Главная
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Управление осколками (MongoDB version)
app.post('/api/admin/manage-shards', async (req, res) => {
    const { owner_id, target_id, amount, action } = req.body;
    
    if (Number(owner_id) !== OWNER_ID) return res.status(403).json({ error: "Доступ запрещен" });

    try {
        const val = parseInt(amount);
        let user = await User.findOne({ tg_id: target_id });

        if (!user) {
            user = new User({ tg_id: target_id });
        }

        if (action === 'add') {
            user.shards += val;
        } else {
            user.shards = Math.max(0, user.shards - val);
        }

        await user.save();
        res.json({ message: `Успешно! Баланс ID ${target_id}: ${user.shards}` });
    } catch (err) {
        res.status(500).json({ error: "Ошибка БД" });
    }
});

app.listen(3000, () => console.log('Сервер работает на порту 3000'));
