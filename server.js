const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// === ЖЕЛЕЗОБЕТОННЫЕ КОНСТАНТЫ ===
const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";
const OPENROUTER_TOKEN = process.env.OPENROUTER_TOKEN || "sk-or-v1-no-key"; 
const CRYPTOBOT_TOKEN = "515785:AAHbRPgnZvc0m0gSsfRpdUJY2UAakj0DceS";
const TG_BOT_TOKEN = "8028858195:AAFZ8YJoZKZY0Lf3cnCH3uLp6cECTNEcwOU";

// Вспомогательные функции
const sendTgMessage = async (tg_id, text) => {
    try {
        await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tg_id, text: text })
        });
    } catch (e) { console.error("TG ERR:", e.message); }
};

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try { await mongoose.connect(MONGO_URI); } catch (err) { console.error('DB ERR:', err.message); }
};

app.use(async (req, res, next) => { await connectDB(); next(); });

// === СХЕМЫ БД ===
const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true }, shards: { type: Number, default: 0 },
    subscription: { type: String, default: "FREE" }, sub_exp: { type: Number, default: 0 },
    is_admin: { type: Boolean, default: false }, last_daily: { type: Number, default: 0 }, daily_streak: { type: Number, default: 0 }
});
const charSchema = new mongoose.Schema({ id: Number, name: String, age: Number, gender: String, desc: String, photo: String });
const promoSchema = new mongoose.Schema({ code: { type: String, unique: true }, reward: Number });
const taskSchema = new mongoose.Schema({ id: Number, name: String, link: String, rType: String, rVal: Number });
const priceSchema = new mongoose.Schema({ item_id: { type: String, unique: true }, stars: { type: Number, default: 0 }, ton: { type: Number, default: 0 } });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Character = mongoose.models.Character || mongoose.model('Character', charSchema);
const Promo = mongoose.models.Promo || mongoose.model('Promo', promoSchema);
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
const Price = mongoose.models.Price || mongoose.model('Price', priceSchema);

const checkAdmin = async (id) => { if (Number(id) === OWNER_ID) return true; const u = await User.findOne({ tg_id: Number(id) }); return u && u.is_admin; };

// === API: ЮЗЕР И ПРОФИЛЬ ===
app.post('/api/user/get-data', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: uid }); if (!user) user = new User({ tg_id: uid });
        if (uid === OWNER_ID) { user.subscription = "Ultra"; user.is_admin = true; if (user.shards < 100000) user.shards = 999999; }
        else if (user.subscription !== "FREE" && user.sub_exp < Date.now()) { user.subscription = "FREE"; user.sub_exp = 0; }
        await user.save();
        let obj = user.toObject(); let s = obj.subscription;
        obj.daily_reward = (s === 'Ultra') ? 500 : (s === 'VIP') ? 250 : (s === 'Pro') ? 100 : (s === 'Premium') ? 50 : 10;
        res.json(obj);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/claim-daily', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id); let user = await User.findOne({ tg_id: uid });
        const now = Date.now(); const gap = now - user.last_daily;
        if (uid !== OWNER_ID && gap < 86400000 && user.last_daily !== 0) return res.status(400).json({ error: "Рано" });
        if (gap > 172800000) user.daily_streak = 0;
        user.daily_streak++;
        let sub = (user.subscription || "FREE").trim();
        let base = (sub === "Ultra") ? 500 : (sub === "VIP") ? 250 : (sub === "Pro") ? 100 : (sub === "Premium") ? 50 : 10;
        let reward = (user.daily_streak >= 7) ? base * 2 : base;
        user.shards += reward; user.last_daily = now;
        if (user.daily_streak >= 7) user.daily_streak = 0;
        await user.save();
        res.json({ success: true, reward, new_balance: user.shards, streak: user.daily_streak });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === API: ЧАТ (СВЕРХ-СТАБИЛЬНЫЙ) ===
app.post('/api/chat', async (req, res) => {
    try {
        const { tg_id, char_id, message, chat_history, sex, len } = req.body;
        const uid = Number(tg_id);
        const user = await User.findOne({ tg_id: uid });
        const char = await Character.findOne({ id: char_id });
        if (!char || !user) return res.status(404).json({ error: "Ошибка данных" });

        if (uid !== OWNER_ID) {
            if (user.shards < 1) return res.status(402).json({ error: "Нет осколков" });
            user.shards -= 1; await user.save();
        }

        const sexLevels = ["Без пошлости", "Легкий флирт", "Поцелуи", "Намеки", "Страсть", "NSFW", "HARDCORE NSFW"];
        let prompt = `RolePlay: Ты ${char.name}, ${char.age} лет. Описание: ${char.desc}. Тон: ${sexLevels[sex] || "Обычный"}. Лимит: ${len || 45} слов. На русском.`;

        let history = chat_history ? chat_history.slice(-6).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })) : [];
        
        // Список моделей: Gemini Flash (самая стабильная) и Llama 3.1
        const models = ["google/gemini-2.0-flash-lite-preview-02-05:free", "meta-llama/llama-3.1-8b-instruct:free"];
        let finalReply = "";

        for (const mId of models) {
            try {
                const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST", headers: { "Authorization": `Bearer ${OPENROUTER_TOKEN}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ model: mId, messages: [{ role: "system", content: prompt }, ...history, { role: "user", content: message }] })
                });
                const data = await aiRes.json();
                if (data.choices && data.choices[0]) { finalReply = data.choices[0].message.content; break; }
            } catch (e) { continue; }
        }

        if (finalReply) {
            res.json({ reply: finalReply, new_balance: user.shards });
        } else {
            if (uid !== OWNER_ID) { user.shards += 1; await user.save(); }
            res.status(500).json({ error: "ИИ временно недоступен. Попробуй через 5 сек." });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// === API: ПЛАТЕЖИ (STARS & TON) ===
app.post('/api/payment/stars-invoice', async (req, res) => {
    try {
        const { tg_id, type, item, amount_stars } = req.body;
        const resLink = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/createInvoiceLink`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: type==='shards'?`Осколки x${item}`:`Подписка ${item}`, description: "Пополнение баланса", payload: JSON.stringify({tg_id,type,item}), provider_token: "", currency: "XTR", prices: [{label:"Цена", amount: Number(amount_stars)}] })
        });
        const d = await resLink.json(); res.json({ invoice_url: d.result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/create', async (req, res) => {
    try {
        const { tg_id, type, item, amount_ton } = req.body;
        const resC = await fetch("https://pay.crypt.bot/api/createInvoice", {
            method: "POST", headers: { "Crypto-Pay-API-Token": CRYPTOBOT_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({ asset: "TON", amount: amount_ton, payload: JSON.stringify({tg_id,type,item}), expires_in: 3600 })
        });
        const d = await resC.json(); res.json({ pay_url: d.result.pay_url });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tg-webhook', async (req, res) => {
    const u = req.body;
    if (u.pre_checkout_query) return fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/answerPreCheckoutQuery`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({pre_checkout_query_id:u.pre_checkout_query.id, ok:true}) }).then(()=>res.sendStatus(200));
    if (u.message?.successful_payment) {
        const pay = JSON.parse(u.message.successful_payment.invoice_payload);
        if (pay.type === 'shards') await User.findOneAndUpdate({tg_id:pay.tg_id}, {$inc:{shards:Number(pay.item)}});
        else { let ex = new Date(); ex.setDate(ex.getDate()+30); await User.findOneAndUpdate({tg_id:pay.tg_id}, {subscription:pay.item, sub_exp:ex.getTime()}); }
        await sendTgMessage(pay.tg_id, "⭐️ Оплата успешно зачислена!");
    }
    res.sendStatus(200);
});

// === АДМИНКА И ОВНЕР (ЖЕЛЕЗОБЕТОН) ===
app.get('/api/get-characters', async (req, res) => res.json(await Character.find()));
app.get('/api/get-tasks', async (req, res) => res.json(await Task.find()));
app.get('/api/get-promos', async (req, res) => res.json(await Promo.find()));

app.post('/api/admin/manage-shards', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет прав" });
    const { target_id, amount, action } = req.body;
    let val = action === 'add' ? Math.abs(amount) : -Math.abs(amount);
    if (val < 0 && Number(req.body.sender_id) !== OWNER_ID) return res.status(403).json({ error: "Только Овнер" });
    await User.findOneAndUpdate({ tg_id: target_id }, { $inc: { shards: val } }, { upsert: true });
    res.json({ message: "Успешно" });
});

app.post('/api/admin/manage-sub', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет прав" });
    const { target_id, sub_type, action, days } = req.body;
    if (action === 'add') {
        let ex = new Date(); ex.setDate(ex.getDate() + (days || 30));
        await User.findOneAndUpdate({ tg_id: target_id }, { subscription: sub_type, sub_exp: ex.getTime() }, { upsert: true });
    } else {
        if (Number(req.body.sender_id) !== OWNER_ID) return res.status(403).json({ error: "Только Овнер" });
        await User.findOneAndUpdate({ tg_id: target_id }, { subscription: "FREE", sub_exp: 0 });
    }
    res.json({ message: "Статус обновлен" });
});

app.post('/api/owner/set-admin', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.sendStatus(403);
    await User.findOneAndUpdate({ tg_id: req.body.target_id }, { is_admin: req.body.status }, { upsert: true });
    res.json({ message: "Готово" });
});

app.post('/api/admin/create-promo', async (req, res) => { if (await checkAdmin(req.body.sender_id)) { await new Promo(req.body.promoData).save(); res.json({ message: "ОК" }); } });
app.post('/api/admin/delete-promo', async (req, res) => { if (await checkAdmin(req.body.sender_id)) { await Promo.findOneAndDelete({ code: req.body.code }); res.json({ message: "ОК" }); } });
app.post('/api/admin/create-task', async (req, res) => { if (await checkAdmin(req.body.sender_id)) { await new Task(req.body.taskData).save(); res.json({ message: "ОК" }); } });
app.post('/api/admin/delete-task', async (req, res) => { if (Number(req.body.sender_id) === OWNER_ID) { await Task.findOneAndDelete({ id: req.body.task_id }); res.json({ message: "ОК" }); } });
app.post('/api/admin/create-char', async (req, res) => { if (await checkAdmin(req.body.sender_id)) { await new Character(req.body.charData).save(); res.json({ message: "ОК" }); } });
app.post('/api/admin/delete-char', async (req, res) => { if (Number(req.body.sender_id) === OWNER_ID) { await Character.findOneAndDelete({ id: req.body.char_id }); res.json({ message: "ОК" }); } });

module.exports = app;
if (!process.env.VERCEL) app.listen(3000, () => console.log("Moon Server Ready"));
