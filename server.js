const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL;
const OWNER_ID = String(process.env.OWNER_ID || "8287041036");

// Подключение к БД
mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
    tgId: Number,
    name: String,
    gender: { type: String, default: 'Мужской' },
    role: { type: String, default: 'user' },
    balance: { type: Number, default: 100 },
    subscription: { type: String, default: 'Free' },
    lengthOffset: { type: Number, default: 50 }
});
const User = mongoose.model('User', UserSchema);

// API АВТОРИЗАЦИИ
app.post('/api/auth', async (req, res) => {
    try {
        const { tgId } = req.body;
        console.log("Auth request from ID:", tgId);
        
        let user = await User.findOne({ tgId: Number(tgId) });
        if (!user) return res.json({ isNew: true });

        // Если это ты - даем BOSS
        if (String(tgId) === OWNER_ID && user.role !== 'owner') {
            user.role = 'owner';
            await user.save();
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { tgId, name, gender } = req.body;
        const role = (String(tgId) === OWNER_ID) ? 'owner' : 'user';
        const user = await User.create({ tgId, name, gender, role });
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = app;
