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

// Принудительное подключение с логами в реальном времени
const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            console.log("✅ База подключена успешно");
        }
    } catch (err) {
        console.error("❌ Ошибка подключения:", err.message);
    }
};

connectDB();

const User = mongoose.model('User', new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: { type: String, default: "User" },
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' }
}));

app.post('/api/auth', async (req, res) => {
    // Если всё еще подключаемся, пробуем еще раз
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }

    const state = mongoose.connection.readyState;
    if (state !== 1) {
        return res.status(500).json({ 
            error: "База не ответила вовремя", 
            status: state,
            hint: "Проверь Network Access -> 0.0.0.0/0 в Atlas"
        });
    }

    try {
        const tid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: tid });
        
        if (!user) {
            user = new User({ tg_id: tid, name: req.body.name || "User" });
        }

        if (tid === OWNER_ID) {
            user.role = 'owner';
            user.moon_shards = 999999999;
            user.sub = 'Ultra';
        }

        await user.save();
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;
