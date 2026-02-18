const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Error:', err));

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    role: { type: String, default: "user" }
});

const User = mongoose.model('User', userSchema);

// ПОЛУЧЕНИЕ ДАННЫХ ЮЗЕРА (Чтобы баланс обновлялся на экране)
app.post('/api/user/get-data', async (req, res) => {
    const { tg_id } = req.body;
    try {
        let user = await User.findOne({ tg_id: Number(tg_id) });
        if (!user) {
            user = new User({ tg_id: Number(tg_id) });
            await user.save();
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Ошибка БД" });
    }
});

// УПРАВЛЕНИЕ ОСКОЛКАМИ
app.post('/api/admin/manage-shards', async (req, res) => {
    const { owner_id, target_id, amount, action } = req.body;
    if (Number(owner_id) !== OWNER_ID) return res.status(403).json({ error: "No Access" });

    try {
        const val = parseInt(amount);
        let user = await User.findOne({ tg_id: Number(target_id) });
        if (!user) user = new User({ tg_id: Number(target_id) });

        if (action === 'add') user.shards += val;
        else user.shards = Math.max(0, user.shards - val);

        await user.save();
        res.json({ message: `Успешно! Баланс ID ${target_id}: ${user.shards}` });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
