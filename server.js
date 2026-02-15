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

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("DB Connected"))
    .catch(err => console.log("DB ERROR:", err.message));

const UserSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: String,
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);

app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, name } = req.body;
        let user = await User.findOne({ tg_id });
        if (!user) user = await User.create({ tg_id, name: name || "User", moon_shards: 100 });
        
        if (tg_id === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ВЫДАЧА ОСКОЛКОВ
app.post('/api/admin/give-shards', async (req, res) => {
    try {
        const { admin_id, target_id, amount } = req.body;
        // Проверка прав отправителя
        const admin = await User.findOne({ tg_id: admin_id });
        if (!admin || (admin.role !== 'admin' && admin.role !== 'owner')) return res.status(403).send("No rights");

        const user = await User.findOneAndUpdate(
            { tg_id: target_id }, 
            { $inc: { moon_shards: Number(amount) } }, 
            { new: true, upsert: true }
        );
        res.json({ success: true, new_balance: user.moon_shards });
    } catch (e) { res.status(500).send(e.message); }
});

// ДОБАВЛЕНИЕ АДМИНА
app.post('/api/admin/add', async (req, res) => {
    try {
        const { owner_id, target_id } = req.body;
        if (Number(owner_id) !== OWNER_ID) return res.status(403).send("Only Owner");

        await User.findOneAndUpdate({ tg_id: target_id }, { role: 'admin' }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).send(e.message); }
});

module.exports = app;
