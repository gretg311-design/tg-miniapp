const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('--- [SYSTEM] MOON ENGINE ACTIVE ---');
    } catch (err) { console.error('DB ERROR:', err.message); }
};

const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "None" },
    is_admin: { type: Boolean, default: false }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

// ВОЗВРАЩАЕМ МОДЕЛЬ ПЕРСОНАЖА
const charSchema = new mongoose.Schema({
    name: String, age: Number, description: String, image: String
});
const Character = mongoose.models.Character || mongoose.model('Character', charSchema);

app.use(async (req, res, next) => { await connectDB(); next(); });

// ПОЛУЧЕНИЕ ДАННЫХ
app.post('/api/user/get-data', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: uid });
        if (!user) { 
            user = new User({ tg_id: uid }); 
            if(uid === OWNER_ID) { user.subscription = "Ultra"; user.is_admin = true; }
            await user.save(); 
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// СОЗДАНИЕ ПЕРСОНАЖА (ВОССТАНОВЛЕНО)
app.post('/api/admin/create-char', async (req, res) => {
    try {
        const sender = await User.findOne({ tg_id: Number(req.body.sender_id) });
        if (Number(req.body.sender_id) !== OWNER_ID && (!sender || !sender.is_admin)) return res.status(403).send("No Access");
        
        const newChar = new Character(req.body);
        await newChar.save();
        res.json({ message: "Персонаж успешно создан!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// АДМИН-ФУНКЦИИ
app.post('/api/owner/set-admin', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("No");
    await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, { is_admin: req.body.status }, { upsert: true });
    res.json({ message: "Статус изменен" });
});

app.post('/api/admin/manage-shards', async (req, res) => {
    await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, { $inc: { shards: req.body.action === 'add' ? Number(req.body.amount) : -Number(req.body.amount) } }, { upsert: true });
    res.json({ message: "Осколки обновлены" });
});

app.post('/api/admin/manage-sub', async (req, res) => {
    await User.findOneAndUpdate({ tg_id: req.body.target_id }, { subscription: req.body.sub_type }, { upsert: true });
    res.json({ message: "Подписка обновлена" });
});

module.exports = app;
app.listen(3000);
