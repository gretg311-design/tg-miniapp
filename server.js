
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const uploadDir = 'public/uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

app.use(express.json());
app.use(express.static('public'));

const { MONGO_URL, OWNER_ID, PORT = 8080 } = process.env;

mongoose.connect(MONGO_URL).then(() => console.log('🌙 БД ПОДКЛЮЧЕНА'));

const UserSchema = new mongoose.Schema({
    tgId: Number,
    name: String,
    gender: String,
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' },
    streak: { type: Number, default: 0 },
    lastDaily: { type: Date, default: new Date(0) },
    lengthOffset: { type: Number, default: 50 }
});
const User = mongoose.model('User', UserSchema);

app.post('/api/auth', async (req, res) => {
    const { tgId, name } = req.body;
    let user = await User.findOne({ tgId });
    if (!user) return res.json({ isNew: true });
    if (String(tgId) === String(OWNER_ID)) {
        user.role = 'owner';
        user.subscription = 'Ultra';
        await user.save();
    }
    res.json(user);
});

app.post('/api/register', async (req, res) => {
    const { tgId, name, gender } = req.body;
    const user = await User.create({
        tgId, name, gender,
        role: (String(tgId) === String(OWNER_ID)) ? 'owner' : 'user'
    });
    res.json(user);
});

app.post('/api/update-settings', async (req, res) => {
    const { tgId, name, gender, lengthOffset } = req.body;
    const user = await User.findOneAndUpdate({ tgId }, { name, gender, lengthOffset }, { new: true });
    res.json(user);
});

app.post('/api/daily', async (req, res) => {
    const { tgId } = req.body;
    const user = await User.findOne({ tgId });
    const rewards = { 'Free': 15, 'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500 };
    let reward = rewards[user.subscription] || 15;
    if (user.streak >= 7) reward *= 2;
    user.balance += reward;
    user.lastDaily = new Date();
    await user.save();
    res.json({ reward, balance: user.balance });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 СЕРВЕР НА ПОРТУ ${PORT}`));
