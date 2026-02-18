const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

// Схема
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: String,
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' }
}));

// Функция подключения (специально для Serverless)
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    return mongoose.connect(MONGO_URI);
};

app.post('/api/auth', async (req, res) => {
    try {
        await connectDB();
        const tid = Number(req.body.tg_id);
        const name = req.body.name || "User";

        if (!tid) return res.status(400).json({ error: "No ID" });

        let user = await User.findOne({ tg_id: tid });

        if (!user) {
            user = await User.create({ 
                tg_id: tid, 
                name: name,
                moon_shards: (tid === OWNER_ID) ? 999999999 : 100,
                role: (tid === OWNER_ID) ? 'owner' : 'user',
                sub: (tid === OWNER_ID) ? 'Ultra' : 'free'
            });
        } else if (tid === OWNER_ID && user.role !== 'owner') {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
            await user.save();
        }

        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "SERVER_CRASH", details: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Важно для Vercel
module.exports = app;
