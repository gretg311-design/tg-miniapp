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

// Логируем попытку подключения
console.log("Attempting to connect to MongoDB...");

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
})
.then(() => console.log("✅ SUCCESS: Connected to MongoDB"))
.catch(err => console.error("❌ ERROR: MongoDB connection failed:", err.message));

const User = mongoose.model('User', new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    name: { type: String, default: "User" },
    moon_shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    role: { type: String, default: 'user' }
}));

app.post('/api/auth', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ 
                error: "База данных не подключена.", 
                status: mongoose.connection.readyState,
                info: "Проверь MONGO_URI и Network Access (0.0.0.0/0)" 
            });
        }

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

        res.json({
            tg_id: Number(user.tg_id),
            name: String(user.name),
            moon_shards: Number(user.moon_shards),
            role: String(user.role),
            sub: String(user.sub)
        });
    } catch (e) {
        res.status(500).json({ error: "Ошибка при авторизации: " + e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;
