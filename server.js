const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

mongoose.connect(MONGO_URI)
    .then(() => console.log('--- База данных Moon подключена ---'))
    .catch(err => console.error('Ошибка MongoDB:', err));

// Схема юзера с учетом подписок
const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" }, // Premium, Pro, VIP, Ultra
    sub_expire: { type: Date, default: null },
    streak: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ПОЛУЧЕНИЕ ДАННЫХ
app.post('/api/user/get-data', async (req, res) => {
    try {
        let user = await User.findOne({ tg_id: Number(req.body.tg_id) });
        if (!user) {
            user = new User({ tg_id: Number(req.body.tg_id) });
            await user.save();
        }
        res.json(user);
    } catch (err) { res.status(500).json({ error: "DB Error" }); }
});

// ВЫДАЧА ОСКОЛКОВ
app.post('/api/admin/manage-shards', async (req, res) => {
    const { owner_id, target_id, amount, action } = req.body;
    if (Number(owner_id) !== OWNER_ID) return res.status(403).json({ error: "Access Denied" });

    try {
        let user = await User.findOne({ tg_id: Number(target_id) });
        if (!user) user = new User({ tg_id: Number(target_id) });

        const val = parseInt(amount) || 0;
        user.shards = (action === 'add') ? user.shards + val : Math.max(0, user.shards - val);

        await user.save();
        res.json({ message: `ID ${target_id}: теперь ${user.shards} осколков` });
    } catch (err) { res.status(500).json({ error: "Error" }); }
});

// ВЫДАЧА ПОДПИСКИ (На 30 дней)
app.post('/api/admin/manage-sub', async (req, res) => {
    const { owner_id, target_id, sub_type } = req.body;
    if (Number(owner_id) !== OWNER_ID) return res.status(403).json({ error: "Access Denied" });

    try {
        let expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 30); // Строго 30 дней

        const user = await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { subscription: sub_type, sub_expire: expireDate },
            { upsert: true, new: true }
        );

        res.json({ message: `ID ${target_id} выдана подписка ${sub_type} до ${expireDate.toLocaleDateString()}` });
    } catch (err) { res.status(500).json({ error: "Sub Error" }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`--- Moon Server запущен на порту ${PORT} ---`));
