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

// КРИПТОБОТ ОСТАЛСЯ
const CRYPTOBOT_TOKEN = "515785:AAHbRPgnZvc0m0gSsfRpdUJY2UAakj0DceS";
// КЛЮЧИ ИИ УДАЛЕНЫ - ИСПОЛЬЗУЕМ ПРЯМОЙ ОБХОД

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('--- [SYSTEM] MOON ENGINE & DIRECT AI BYPASS ACTIVE ---');
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

// ================= API: ЮЗЕРЫ =================
app.post('/api/user/get-data', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: uid });
        
        if (!user) { 
            user = new User({ tg_id: uid }); 
            if(uid === OWNER_ID) { user.subscription = "Ultra"; user.is_admin = true; user.shards = 999999; }
            await user.save(); 
        }

        if (uid !== OWNER_ID && user.subscription !== "FREE" && user.sub_exp > 0 && user.sub_exp < Date.now()) {
            user.subscription = "FREE"; user.sub_exp = 0; await user.save();
        }
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/claim-daily', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        if (uid === OWNER_ID) return res.json({ success: true, reward: 500, new_balance: 999999, streak: 0 });

        let user = await User.findOne({ tg_id: uid });
        if (!user) return res.status(404).json({ error: "Юзер не найден" });

        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const timePassed = now - user.last_daily;

        if (timePassed < ONE_DAY && user.last_daily !== 0) return res.status(400).json({ error: "Рано", timeLeft: ONE_DAY - timePassed });
        if (timePassed > ONE_DAY * 2 && user.last_daily !== 0) user.daily_streak = 0;

        user.daily_streak += 1;
        let is7thDay = (user.daily_streak % 7 === 0);

        let baseRew = 10;
        if (user.subscription === "Ultra") baseRew = 500;
        else if (user.subscription === "VIP") baseRew = 250;
        else if (user.subscription === "Pro") baseRew = 100;
        else if (user.subscription === "Premium") baseRew = 50;

        let actualRew = is7thDay ? baseRew * 2 : baseRew;
        user.shards += actualRew;
        user.last_daily = now;
        if (is7thDay) user.daily_streak = 0;

        await user.save();
        res.json({ success: true, reward: actualRew, new_balance: user.shards, streak: user.daily_streak });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================= API: ЧАТ И ИИ (ГЕНИАЛЬНЫЙ ОБХОД ЧЕРЕЗ ССЫЛКУ) =================
app.post('/api/chat', async (req, res) => {
    try {
        const { tg_id, char_id, message, chat_history, len, sex } = req.body;
        const uid = Number(tg_id);

        let user = await User.findOne({ tg_id: uid });
        if (!user) return res.status(404).json({ error: "Юзер не найден в БД" });

        if (uid !== OWNER_ID) {
            if (user.shards < 1) return res.status(402).json({ error: "Недостаточно осколков" });
            user.shards -= 1;
            await user.save();
        }

        const char = await Character.findOne({ id: char_id });
        if (!char) return res.status(404).json({ error: "Персонаж не найден в БД" });

        const sexLevels = ["Без пошлости", "Легкий флирт", "Поцелуи", "Откровенные намеки", "Страсть", "RolePlay без цензуры", "ХАРДКОР NSFW"];
        
        // Собираем всё в ОДИН сплошной текст
        let fullPrompt = `[СИСТЕМА]: Ты в RolePlay чате. Твоя роль: ${char.name} (${char.age} лет). Пол: ${char.gender === 'm' ? 'М' : 'Ж'}. Описание: ${char.desc}. Отвечай строго от лица персонажа. Длина: ~${len} слов. Откровенность: ${sexLevels[sex]}.\n\n`;

        if (chat_history && chat_history.length > 0) {
            chat_history.slice(-8).forEach(msg => {
                fullPrompt += (msg.sender === 'user' ? "User: " : char.name + ": ") + msg.text + "\n";
            });
        }
        fullPrompt += "User: " + message + "\n" + char.name + ": ";

        // ОБХОД ЗАЩИТЫ: Отправляем промпт тупо через адресную строку браузера
        const aiUrl = "https://text.pollinations.ai/" + encodeURIComponent(fullPrompt) + "?model=mistral";

        const aiResponse = await fetch(aiUrl);
        
        if (!aiResponse.ok) {
            return res.status(500).json({ error: `Сервер ИИ тупит (Код ${aiResponse.status}). Попробуй еще раз.` });
        }

        const replyText = await aiResponse.text();
        
        if (replyText) {
            res.json({ reply: replyText.trim(), new_balance: user.shards });
        } else {
            res.status(500).json({ error: "ИИ ответил пустотой." });
        }

    } catch (e) { 
        console.error("CHAT CRASH:", e);
        res.status(500).json({ error: "Сбой связи: " + e.message }); 
    }
});

// ================= API: КРИПТОБОТ ОПЛАТА =================
app.post('/api/payment/create', async (req, res) => {
    try {
        const { tg_id, type, item, amount_ton } = req.body;
        const customPayload = JSON.stringify({ tg_id: Number(tg_id), type, item });

        const response = await fetch("https://pay.crypt.bot/api/createInvoice", {
            method: "POST",
            headers: {
                "Crypto-Pay-API-Token": CRYPTOBOT_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset: "TON", amount: amount_ton, payload: customPayload, expires_in: 3600
            })
        });

        const data = await response.json();
        if(data.ok) { res.json({ pay_url: data.result.pay_url }); } else { res.status(400).json({ error: "Ошибка CryptoBot" }); }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/webhook', async (req, res) => {
    try {
        const update = req.body;
        if (update.update_type === 'invoice_paid') {
            const invoice = update.payload;
            const customData = JSON.parse(invoice.payload);
            const uid = Number(customData.tg_id);

            if (customData.type === 'shards') {
                await User.findOneAndUpdate({ tg_id: uid }, { $inc: { shards: Number(customData.item) } }, { upsert: true });
            } else if (customData.type === 'sub') {
                const expDate = new Date(); expDate.setDate(expDate.getDate() + 30);
                await User.findOneAndUpdate({ tg_id: uid }, { subscription: customData.item, sub_exp: expDate.getTime() }, { upsert: true });
            }
        }
        res.sendStatus(200); 
    } catch (e) { res.sendStatus(500); }
});

// ================= API: ПУБЛИЧНЫЕ ДАННЫЕ =================
app.get('/api/get-characters', async (req, res) => { res.json(await Character.find()); });
app.get('/api/get-tasks', async (req, res) => { res.json(await Task.find()); });
app.get('/api/get-promos', async (req, res) => { res.json(await Promo.find()); });

// ================= API: АДМИНКА И КОНСОЛЬ =================
app.post('/api/admin/manage-shards', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).send("No Access");
    await User.findOneAndUpdate( { tg_id: Number(req.body.target_id) }, { $inc: { shards: req.body.action === 'add' ? Number(req.body.amount) : -Number(req.body.amount) } }, { upsert: true });
    res.json({ message: "Готово" });
});

app.post('/api/admin/manage-sub', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).send("No Access");
    let updateData = {};
    if (req.body.action === 'add') {
        const expDate = new Date(); expDate.setDate(expDate.getDate() + 30);
        updateData = { subscription: req.body.sub_type, sub_exp: expDate.getTime() };
    } else { updateData = { subscription: "FREE", sub_exp: 0 }; }
    await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, updateData, { upsert: true });
    res.json({ message: "Готово" });
});

app.post('/api/admin/create-char', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).send("No Access");
    await new Character(req.body.charData).save();
    res.json({ message: "Персонаж создан!" });
});

app.post('/api/admin/delete-char', async (req, res) => {
    if (Number(req.body.sender_id) !== OWNER_ID) return res.status(403).send("Only Owner");
    await Character.findOneAndDelete({ id: req.body.char_id });
    res.json({ message: "Удалено" });
});

app.post('/api/admin/create-promo', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).send("No Access");
    await new Promo(req.body.promoData).save();
    res.json({ message: "Промокод создан" });
});

app.post('/api/admin/create-task', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).send("No Access");
    await new Task(req.body.taskData).save();
    res.json({ message: "Задание создано" });
});

app.post('/api/owner/set-admin', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).send("Only Owner");
    await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, { is_admin: req.body.status }, { upsert: true });
    res.json({ message: "Готово" });
});

app.post('/api/owner/set-price', async (req, res) => {
    if (Number(req.body.sender_id) !== OWNER_ID) return res.status(403).send("Only Owner");
    const { item_id, stars, ton } = req.body;
    await Price.findOneAndUpdate({ item_id }, { stars: Number(stars), ton: Number(ton) }, { upsert: true });
    res.json({ message: "Цена сохранена!" });
});

module.exports = app;
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[SYSTEM] Сервер запущен на порту ${PORT}`));
