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
    .then(() => console.log("DB OK"))
    .catch(err => console.log("DB ERR:", err));

const User = mongoose.model('User', new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: String,
    moon_shards: { type: Number, default: 100 },
    role: { type: String, default: 'user' }
}));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Авторизация
app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, name } = req.body;
        if(!tg_id) return res.status(400).send("No ID");
        
        let user = await User.findOne({ tg_id: Number(tg_id) });
        if (!user) user = await User.create({ tg_id: Number(tg_id), name: name || "User" });
        
        if (Number(tg_id) === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            await user.save();
        }
        res.json(user);
    } catch (e) { res.status(500).json(e); }
});

// Выдача осколков
app.post('/api/admin/give-shards', async (req, res) => {
    try {
        const { admin_id, target_id, amount } = req.body;
        
        // Проверка прав
        if (Number(admin_id) !== OWNER_ID) {
            const adm = await User.findOne({ tg_id: Number(admin_id) });
            if(!adm || adm.role !== 'admin') return res.status(403).json({status:"error"});
        }

        const user = await User.findOneAndUpdate(
            { tg_id: Number(target_id) },
            { $inc: { moon_shards: Number(amount) } },
            { new: true, upsert: true }
        );
        res.json({ status: "success", new_balance: user.moon_shards });
    } catch (e) { res.status(500).json({status:"error", msg: e.message}); }
});

module.exports = app;
