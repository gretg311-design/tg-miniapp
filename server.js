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

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, name } = req.body;
        let user = await User.findOne({ tg_id: Number(tg_id) });
        if (!user) user = await User.create({ tg_id: Number(tg_id), name: name || "User" });
        if (Number(tg_id) === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
            await user.save();
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/give-shards', async (req, res) => {
    try {
        const { admin_id, target_id, amount } = req.body;
        const admin = await User.findOne({ tg_id: Number(admin_id) });
        if (!admin || (admin.role !== 'admin' && admin.role !== 'owner')) return res.status(403).json({status:"error"});
        const user = await User.findOneAndUpdate({ tg_id: Number(target_id) }, { $inc: { moon_shards: Number(amount) } }, { new: true, upsert: true });
        res.json({ status: "success", new_balance: user.moon_shards });
    } catch (e) { res.status(500).json({status:"error"}); }
});

module.exports = app;
