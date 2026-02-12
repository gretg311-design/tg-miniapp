require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const OWNER_ID = 8287041036;

// Подключение с коротким таймаутом, чтобы не вешать сервер
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000 
}).then(() => console.log("✅ База на связи"))
  .catch(err => console.error("❌ Ошибка базы:", err.message));

const UserSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    gender: String,
    shards: { type: Number, default: 100 },
    sub: { type: String, default: 'free' },
    streak: { type: Number, default: 0 },
    last_daily: Date
});
const User = mongoose.model('User', UserSchema);

app.post('/api/auth', async (req, res) => {
    try {
        const { tg_id, gender } = req.body;
        if (!tg_id) return res.status(400).send("No ID");

        // Если база не подключена, выдаем ошибку сразу, а не ждем 30 сек
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ error: "DB_DISCONNECTED" });
        }

        let user = await User.findOne({ tg_id });
        if (!user) {
            user = await User.create({ tg_id, gender: gender || 'Парень', shards: 100 });
        }
        
        // Твои условия как Овнера
        if (tg_id === OWNER_ID) {
            user.shards = 999999; 
            user.sub = 'Ultra';
        }
        
        res.json(user);
    } catch (e) {
        console.error("Ошибка Auth:", e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = app;
