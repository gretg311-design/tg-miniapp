require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB Connected"))
    .catch(err => console.log("DB Error:", err));

const User = mongoose.model('User', new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: String,
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' }
}));

// API: Авторизация - ЖЕСТКО возвращаем плоский объект
app.post('/api/auth', async (req, res) => {
    try {
        const tid = Number(req.body.tg_id);
        const name = req.body.name || "User";
        
        let user = await User.findOne({ tg_id: tid });
        
        if (!user) {
            user = await User.create({ tg_id: tid, name: name, moon_shards: 100 });
        }

        // Если зашел Овнер - обновляем статус при каждом входе
        if (tid === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
            await user.save();
        }

        // Возвращаем данные БЕЗ лишних оберток
        res.json({
            tg_id: Number(user.tg_id),
            name: String(user.name),
            moon_shards: Number(user.moon_shards),
            role: String(user.role),
            sub: String(user.sub)
        });
    } catch (e) {
        res.status(500).json({ error: "Server Error", details: e.message });
    }
});

app.post('/api/admin/give-shards', async (req, res) => {
    try {
        const { admin_id, target_id, amount } = req.body;
        const a_id = Number(admin_id);
        
        if (a_id !== OWNER_ID) {
            const admin = await User.findOne({ tg_id: a_id });
            if (!admin || admin.role !== 'admin') return res.status(403).json({ status: "error" });
        }

        const user = await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { $inc: { moon_shards: Number(amount) } },
            { new: true, upsert: true }
        );
        res.json({ status: "success", new_balance: Number(user.moon_shards) });
    } catch (e) { res.status(500).json({ status: "error" }); }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

module.exports = app;
