const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Увеличиваем лимиты для фото персонажей
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

// Функция подключения к БД с обработкой ошибок, чтобы сервер не падал (Ошибка 500)
const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // Ждать максимум 5 сек
        });
        console.log('--- [SYSTEM] MOON ENGINE ACTIVE ---');
    } catch (err) {
        console.error('--- [ERROR] DB CONNECTION FAILED:', err.message);
    }
};

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    sub_expire: { type: Date, default: null },
    is_admin: { type: Boolean, default: false }
});

// Проверка существования модели (важно для Vercel/Serverless)
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Middleware для гарантии подключения перед запросом
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

app.post('/api/user/get-data', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        if (!uid) return res.status(400).json({ error: "No ID provided" });

        let user = await User.findOne({ tg_id: uid });
        if (!user) { 
            user = new User({ tg_id: uid }); 
            if(uid === OWNER_ID) { 
                user.subscription = "Ultra"; 
                user.is_admin = true; 
            }
            await user.save(); 
        }
        res.json(user);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Database error", details: e.message }); 
    }
});

app.post('/api/owner/set-admin', async (req, res) => {
    try {
        if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).json({ error: "No Access" });
        const { target_id, status } = req.body;
        await User.findOneAndUpdate({ tg_id: Number(target_id) }, { is_admin: status }, { upsert: true });
        res.json({ message: status ? `ID ${target_id} назначен Админом` : `ID ${target_id} снят` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/manage-shards', async (req, res) => {
    try {
        const sender = await User.findOne({ tg_id: Number(req.body.sender_id) });
        const isOwner = Number(req.body.sender_id) === OWNER_ID;
        if (!isOwner && (!sender || !sender.is_admin)) return res.status(403).send("No Access");
        
        await User.findOneAndUpdate(
            { tg_id: Number(req.body.target_id) },
            { $inc: { shards: req.body.action === 'add' ? Number(req.body.amount) : -Number(req.body.amount) } },
            { upsert: true }
        );
        res.json({ message: `Баланс обновлен` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/manage-sub', async (req, res) => {
    try {
        const sender = await User.findOne({ tg_id: Number(req.body.sender_id) });
        const isOwner = Number(req.body.sender_id) === OWNER_ID;
        if (!isOwner && (!sender || !sender.is_admin)) return res.status(403).send("No Access");
        
        const exp = req.body.sub_type === "None" ? null : new Date(Date.now() + 30*24*60*60*1000);
        await User.findOneAndUpdate({ tg_id: req.body.target_id }, { subscription: req.body.sub_type, sub_expire: exp }, { upsert: true });
        res.json({ message: "Подписка изменена" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Для Vercel не обязательно указывать app.listen, но оставим для локальных тестов
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; // Обязательно для Vercel
