const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'public/uploads/' });

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
    lastDaily: { type: Date, default: new Date(0) }
});
const User = mongoose.model('User', UserSchema);

const CharSchema = new mongoose.Schema({
    name: String,
    desc: String,
    photo: String,
    creatorId: Number
});
const Char = mongoose.model('Character', CharSchema);

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

app.post('/api/daily', async (req, res) => {
    const { tgId } = req.body;
    const user = await User.findOne({ tgId });
    const rewards = { 'Free': 15, 'Premium': 50, 'Pro': 100, 'VIP': 250, 'Ultra': 500 };
    let reward = rewards[user.subscription] || 15;
    
    const now = new Date();
    if (user.streak >= 7) reward *= 2;

    user.balance += reward;
    user.lastDaily = now;
    await user.save();
    res.json({ reward, balance: user.balance });
});

app.post('/api/create-character', upload.single('photo'), async (req, res) => {
    const { name, desc, creatorId } = req.body;
    const character = await Char.create({
        name,
        desc,
        photo: `/uploads/${req.file.filename}`,
        creatorId
    });
    res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`));

