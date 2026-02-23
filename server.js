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

// ================= СХЕМЫ БАЗЫ ДАННЫХ =================
const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true },
    shards: { type: Number, default: 0 },
    subscription: { type: String, default: "FREE" },
    sub_exp: { type: Number, default: 0 }, // Timestamp окончания подписки
    is_admin: { type: Boolean, default: false }
});

const charSchema = new mongoose.Schema({
    name: String, age: Number, gender: String, description: String, image: String
});

const priceSchema = new mongoose.Schema({
    item_id: { type: String, unique: true },
    stars: { type: Number, default: 0 },
    ton: { type: Number, default: 0 }
});

// Новые схемы под наш фронтенд
const promoSchema = new mongoose.Schema({
    code: { type: String, unique: true },
    reward: Number
});

const taskSchema = new mongoose.Schema({
    name: String, link: String, rType: String, rVal: Number
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Character = mongoose.models.Character || mongoose.model('Character', charSchema);
const Price = mongoose.models.Price || mongoose.model('Price', priceSchema);
const Promo = mongoose.models.Promo || mongoose.model('Promo', promoSchema);
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

app.use(async (req, res, next) => { await connectDB(); next(); });

// ================= API: ЮЗЕРЫ =================
// Получить данные юзера при входе
app.post('/api/user/get-data', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: uid });
        
        if (!user) { 
            user = new User({ tg_id: uid }); 
            if(uid === OWNER_ID) { user.subscription = "ULTRA"; user.is_admin = true; }
            await user.save(); 
        }

        // Проверка на истечение подписки (кроме Овнера)
        if (uid !== OWNER_ID && user.subscription !== "FREE" && user.sub_exp < Date.now()) {
            user.subscription = "FREE";
            user.sub_exp = 0;
            await user.save();
        }

        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================= API: ПОЛУЧЕНИЕ ДАННЫХ (ДЛЯ ФРОНТА) =================
app.get('/api/get-characters', async (req, res) => {
    const chars = await Character.find();
    res.json(chars);
});

app.get('/api/get-tasks', async (req, res) => {
    const tasks = await Task.find();
    res.json(tasks);
});

app.get('/api/get-promos', async (req, res) => {
    const promos = await Promo.find();
    res.json(promos);
});

// ================= API: АДМИНКА И КОНСОЛЬ =================
// Проверка прав (Мидлвар для защиты)
const checkAdmin = async (sender_id) => {
    if (Number(sender_id) === OWNER_ID) return true;
    const sender = await User.findOne({ tg_id: Number(sender_id) });
    return sender && sender.is_admin;
};

app.post('/api/admin/set-price', async (req, res) => {
    const { sender_id, item_id, stars, ton } = req.body;
    if (!(await checkAdmin(sender_id))) return res.status(403).send("No Access");
    await Price.findOneAndUpdate({ item_id }, { stars: Number(stars), ton: Number(ton) }, { upsert: true });
    res.json({ message: "Цена сохранена!" });
});

app.post('/api/admin/create-char', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).send("No Access");
    await new Character(req.body.charData).save(); // charData: {name, age, gender, desc, image}
    res.json({ message: "Персонаж создан!" });
});

// ВЫДАЧА ОСКОЛКОВ (ЗАЩИЩЕНО)
app.post('/api/admin/manage-shards', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).send("No Access");
    
    await User.findOneAndUpdate(
        { tg_id: Number(req.body.target_id) }, 
        { $inc: { shards: req.body.action === 'add' ? Number(req.body.amount) : -Number(req.body.amount) } }, 
        { upsert: true }
    );
    res.json({ message: "Готово" });
});

// ВЫДАЧА ПОДПИСКИ (ЗАЩИЩЕНО + ЛОГИКА 30 ДНЕЙ)
app.post('/api/admin/manage-sub', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).send("No Access");
    
    let updateData = {};
    if (req.body.action === 'add') {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 30); // Плюс 30 дней
        updateData = { subscription: req.body.sub_type, sub_exp: expDate.getTime() };
    } else {
        updateData = { subscription: "FREE", sub_exp: 0 };
    }

    await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, updateData, { upsert: true });
    res.json({ message: "Готово" });
});

// НАЗНАЧЕНИЕ АДМИНА (ТОЛЬКО ОВНЕР)
app.post('/api/owner/set-admin', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("Only Owner");
    await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, { is_admin: req.body.status }, { upsert: true });
    res.json({ message: "Готово" });
});

module.exports = app;
app.listen(3000);
