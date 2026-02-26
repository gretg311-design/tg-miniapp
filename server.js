const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// === ЖЕЛЕЗОБЕТОННЫЕ НАСТРОЙКИ ===
const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

// КЛЮЧИ
const HF_TOKEN = "hf_" + "EhICrHTZAzTbhabiMGjvQFxDthNoMiRSWk"; 
const CRYPTOBOT_TOKEN = "515785:AAHbRPgnZvc0m0gSsfRpdUJY2UAakj0DceS";
const TG_BOT_TOKEN = "8028858195:AAFZ8YJoZKZY0Lf3cnCH3uLp6cECTNEcwOU";

// ФУНКЦИЯ ОТПРАВКИ УВЕДОМЛЕНИЙ В ТЕЛЕГРАМ
const sendTgMessage = async (tg_id, text) => {
    try {
        await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tg_id, text: text })
        });
    } catch (e) { console.error("TG BOT ERROR:", e.message); }
};

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('--- [SYSTEM] MOON ENGINE & SMART AI-SPLIT ACTIVE ---');
    } catch (err) { console.error('DB ERROR:', err.message); }
};

app.use(async (req, res, next) => { await connectDB(); next(); });

// ================= СХЕМЫ БАЗЫ ДАННЫХ =================
const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "FREE" },
    sub_exp: { type: Number, default: 0 },
    is_admin: { type: Boolean, default: false },
    last_daily: { type: Number, default: 0 },
    daily_streak: { type: Number, default: 0 }
});

const charSchema = new mongoose.Schema({
    id: Number, name: String, age: Number, gender: String, desc: String, photo: String
});

const promoSchema = new mongoose.Schema({ code: { type: String, unique: true }, reward: Number });
const taskSchema = new mongoose.Schema({ id: Number, name: String, link: String, rType: String, rVal: Number });
const priceSchema = new mongoose.Schema({ item_id: { type: String, unique: true }, stars: { type: Number, default: 0 }, ton: { type: Number, default: 0 } });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Character = mongoose.models.Character || mongoose.model('Character', charSchema);
const Promo = mongoose.models.Promo || mongoose.model('Promo', promoSchema);
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
const Price = mongoose.models.Price || mongoose.model('Price', priceSchema);

const checkAdmin = async (sender_id) => {
    if (Number(sender_id) === OWNER_ID) return true;
    const sender = await User.findOne({ tg_id: Number(sender_id) });
    return sender && sender.is_admin;
};

// ================= API: ПРОФИЛЬ И ЮЗЕРЫ =================
app.post('/api/user/get-data', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: uid });
        if (!user) { user = new User({ tg_id: uid }); }

        let isModified = false;
        if (user.subscription) {
            let cleanSub = user.subscription.trim();
            if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra";
            else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP";
            else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro";
            else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium";
            else cleanSub = "FREE";

            if (user.subscription !== cleanSub) { user.subscription = cleanSub; isModified = true; }
        }

        if (uid === OWNER_ID) {
            if (user.subscription !== "Ultra") { user.subscription = "Ultra"; isModified = true; }
            if (!user.is_admin) { user.is_admin = true; isModified = true; }
            if (user.shards < 10000) { user.shards = 999999; isModified = true; }
        } else if (user.subscription !== "FREE" && user.sub_exp > 0 && user.sub_exp < Date.now()) {
            user.subscription = "FREE"; user.sub_exp = 0; isModified = true;
        }

        if (isModified || user.isNew) { await user.save(); }

        let responseObj = user.toObject();
        let s = responseObj.subscription;
        responseObj.daily_reward = (s === 'Ultra') ? 500 : (s === 'VIP') ? 250 : (s === 'Pro') ? 150 : (s === 'Premium') ? 50 : 10;
        res.json(responseObj);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/sync', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: uid });
        if (!user) return res.json({ shards: 0, subscription: "FREE" });

        let cleanSub = user.subscription ? user.subscription.trim() : "FREE";
        if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra";
        else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP";
        else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro";
        else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium";
        else cleanSub = "FREE";

        if (uid === OWNER_ID) { cleanSub = "Ultra"; }
        res.json({ shards: user.shards, subscription: cleanSub });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/claim-daily', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: uid });
        if (!user) return res.status(404).json({ error: "Юзер не найден" });

        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const timePassed = now - user.last_daily;

        if (uid !== OWNER_ID) {
            if (timePassed < ONE_DAY && user.last_daily !== 0) return res.status(400).json({ error: "Рано", timeLeft: ONE_DAY - timePassed });
            if (timePassed > ONE_DAY * 2 && user.last_daily !== 0) user.daily_streak = 0;
        }

        user.daily_streak += 1;
        let is7thDay = (user.daily_streak % 7 === 0);

        let sub = (user.subscription || "FREE").trim().toLowerCase();
        if (uid === OWNER_ID) sub = "ultra";

        let baseRew = 10;
        if (sub === "ultra") baseRew = 500;
        else if (sub === "vip") baseRew = 250;
        else if (sub === "pro") baseRew = 150;
        else if (sub === "premium") baseRew = 50;

        let actualRew = is7thDay ? baseRew * 2 : baseRew; 
        user.shards += actualRew;
        user.last_daily = now;
        let currentStreak = user.daily_streak;
        if (is7thDay) user.daily_streak = 0; 

        await user.save();
        res.json({ success: true, reward: actualRew, new_balance: user.shards, streak: currentStreak });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
