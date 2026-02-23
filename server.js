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

// ФУНКЦИЯ ОТПРАВКИ УВЕДОМЛЕНИЙ В ТЕЛЕГРАМ (Теперь с await, чтобы Vercel не замораживал её)
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
        console.log('--- [SYSTEM] MOON ENGINE & TG NOTIFICATIONS ACTIVE ---');
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
        
        if (!user) { 
            user = new User({ tg_id: uid }); 
        }

        let isModified = false;

        if (user.subscription) {
            let cleanSub = user.subscription.trim();
            if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra";
            else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP";
            else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro";
            else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium";
            else cleanSub = "FREE";

            if (user.subscription !== cleanSub) {
                user.subscription = cleanSub;
                isModified = true;
            }
        }

        if (uid === OWNER_ID) {
            if (user.subscription !== "Ultra") { user.subscription = "Ultra"; isModified = true; }
            if (!user.is_admin) { user.is_admin = true; isModified = true; }
            if (user.shards < 10000) { user.shards = 999999; isModified = true; }
        } else if (user.subscription !== "FREE" && user.sub_exp > 0 && user.sub_exp < Date.now()) {
            user.subscription = "FREE"; 
            user.sub_exp = 0; 
            isModified = true;
        }

        if (isModified || user.isNew) {
            await user.save();
        }

        let responseObj = user.toObject();
        let s = responseObj.subscription;
        responseObj.daily_reward = (s === 'Ultra') ? 500 : (s === 'VIP') ? 250 : (s === 'Pro') ? 150 : (s === 'Premium') ? 50 : 10;

        res.json(responseObj);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ЕЖЕДНЕВКИ И СТРИКИ
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

        let sub = (user.subscription || "FREE").trim();
        if (uid === OWNER_ID) sub = "Ultra";

        let baseRew = 10;
        if (sub === "Ultra") baseRew = 500;
        else if (sub === "VIP") baseRew = 250;
        else if (sub === "Pro") baseRew = 150;
        else if (sub === "Premium") baseRew = 50;

        let actualRew = is7thDay ? baseRew * 2 : baseRew; 
        
        user.shards += actualRew;
        user.last_daily = now;
        
        let currentStreak = user.daily_streak;
        if (is7thDay) user.daily_streak = 0; 

        await user.save();
        res.json({ success: true, reward: actualRew, new_balance: user.shards, streak: currentStreak });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// ================= API: ЧАТ (С HUGGING FACE КАРУСЕЛЬЮ И ПРОВЕРКОЙ ПОШЛОСТИ) =================
app.post('/api/chat', async (req, res) => {
    try {
        const { tg_id, char_id, message, chat_history, len, sex } = req.body;
        const uid = Number(tg_id);

        let user = await User.findOne({ tg_id: uid });
        if (!user) return res.status(404).json({ error: "Юзер не найден в БД" });

        let requestedSex = Number(sex) || 0;
        let userSub = (uid === OWNER_ID) ? "ultra" : (user.subscription || "FREE").trim().toLowerCase();
        
        if (requestedSex >= 6 && userSub !== "ultra") {
            return res.status(403).json({ error: "6 уровень откровенности доступен только с подпиской Ultra!" });
        }

        if (uid !== OWNER_ID) {
            if (user.shards < 1) return res.status(402).json({ error: "Недостаточно осколков" });
            user.shards -= 1;
            await user.save(); 
        }

        const char = await Character.findOne({ id: char_id });
        if (!char) return res.status(404).json({ error: "Персонаж не найден в БД" });

        const sexLevels = [
            "Строго без пошлости. Игнорируй любые намеки на интим.", 
            "Слабая романтика, легкий флирт.", 
            "Нормальный уровень общения, допускаются поцелуи.", 
            "Сильный флирт, откровенные намеки.", 
            "Высокая откровенность, страсть.", 
            "Очень пошло, откровенный RolePlay без цензуры.", 
            "СУПЕР ПОШЛОСТЬ, хардкорный NSFW, описывай все детали открыто." 
        ];
        
        let systemPrompt = `Ты находишься в RolePlay чате. Твоя роль: Имя - ${char.name}, Возраст - ${char.age}, Пол - ${char.gender === 'm' ? 'Мужской' : 'Женский'}. 
Твоя легенда: ${char.desc}. 
Веди себя строго в рамках персонажа. Длина ответа: около ${len} слов. 
Уровень откровенности: ${sexLevels[requestedSex]}.`;

        let messagesArray = [{ role: "system", content: systemPrompt }];
        if (chat_history && chat_history.length > 0) {
            let recentHistory = chat_history.slice(-10);
            recentHistory.forEach(msg => {
                messagesArray.push({ role: msg.sender === 'user' ? "user" : "assistant", content: msg.text });
            });
        }
        messagesArray.push({ role: "user", content: message });

        const hfModels = [
            "mistralai/Mistral-7B-Instruct-v0.3",
            "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
            "Qwen/Qwen2.5-7B-Instruct"
        ];

        let aiData = null;
        let lastErrorStatus = null;

        for (const model of hfModels) {
            console.log(`[AI] Пробуем HF модель: ${model}`);
            const aiResponse = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: messagesArray,
                    max_tokens: 300,
                    temperature: 0.85
                })
            });

            if (aiResponse.ok) {
                aiData = await aiResponse.json();
                break; 
            } else {
                lastErrorStatus = aiResponse.status;
                if (lastErrorStatus === 401) {
                    if (uid !== OWNER_ID) { user.shards += 1; await user.save(); }
                    return res.status(500).json({ error: "Ошибка 401: Токен HF недействителен." });
                }
            }
        }

        if (!aiData) {
            if (uid !== OWNER_ID) { user.shards += 1; await user.save(); }
            return res.status(500).json({ error: `Все нейросети заняты (Последний код: ${lastErrorStatus}). Попробуй через пару секунд.` });
        }
        
        if (aiData.choices && aiData.choices[0] && aiData.choices[0].message) {
            res.json({ reply: aiData.choices[0].message.content, new_balance: user.shards });
        } else {
            if (uid !== OWNER_ID) { user.shards += 1; await user.save(); }
            res.status(500).json({ error: "ИИ прислал пустой ответ." });
        }

    } catch (e) { 
        console.error("CHAT CRASH EXCEPTION:", e);
        res.status(500).json({ error: "Сбой связи: " + e.message }); 
    }
});

// ================= API: ОПЛАТА =================
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
                await sendTgMessage(uid, `Вам начислено ${customData.item} токенов после оплаты.`);
            } else if (customData.type === 'sub') {
                const expDate = new Date(); expDate.setDate(expDate.getDate() + 30);
                await User.findOneAndUpdate({ tg_id: uid }, { subscription: customData.item, sub_exp: expDate.getTime() }, { upsert: true });
                await sendTgMessage(uid, `Ваша подписка ${customData.item} успешно активирована!`);
            }
        }
        res.sendStatus(200); 
    } catch (e) { res.sendStatus(500); }
});

// ================= API: ВОЗВРАЩЕНИЕ ОБЩИХ ДАННЫХ =================
app.get('/api/get-characters', async (req, res) => { res.json(await Character.find()); });
app.get('/api/get-tasks', async (req, res) => { res.json(await Task.find()); });
app.get('/api/get-promos', async (req, res) => { res.json(await Promo.find()); });

// ================= API: АДМИНКА И КОНСОЛЬ (С БРОНЕБОЙНЫМ СНЯТИЕМ ОСКОЛКОВ) =================
app.post('/api/admin/manage-shards', async (req, res) => {
    const sender_id = Number(req.body.sender_id);
    const target_id = Number(req.body.target_id);
    const isOwner = sender_id === OWNER_ID;
    
    if (!isOwner && !(await checkAdmin(sender_id))) return res.status(403).json({ error: "Нет доступа" });

    const action = (req.body.action || '').toLowerCase().trim();
    let rawAmount = Number(req.body.amount);

    // Логика: если команда не "add" (добавить) ИЛИ пришло число с минусом -> это списание
    let isRemoving = (action !== 'add' && action !== '') || rawAmount < 0;
    let amount = Math.abs(rawAmount); // Всегда чистая цифра

    if (isRemoving) {
        if (!isOwner) return res.status(403).json({ error: "Только Овнер может забирать осколки" });
        
        let user = await User.findOne({ tg_id: target_id });
        if (user && user.shards < amount) amount = user.shards; // Не пускаем баланс в минуса
        
        await User.findOneAndUpdate({ tg_id: target_id }, { $inc: { shards: -amount } }, { upsert: true });
        await sendTgMessage(target_id, `Администратор забрал у вас ${amount} токенов`);
        res.json({ message: `Снято ${amount} осколков` });
    } else {
        await User.findOneAndUpdate({ tg_id: target_id }, { $inc: { shards: amount } }, { upsert: true });
        await sendTgMessage(target_id, `Администратор выдал вам ${amount} токенов`);
        res.json({ message: `Выдано ${amount} осколков` });
    }
});

app.post('/api/admin/manage-sub', async (req, res) => {
    const sender_id = Number(req.body.sender_id);
    const target_id = Number(req.body.target_id);
    const isOwner = sender_id === OWNER_ID;

    if (!isOwner && !(await checkAdmin(sender_id))) return res.status(403).json({ error: "Нет доступа" });

    if (req.body.action === 'add') {
        let days = 30; 
        if (isOwner && req.body.days) days = Number(req.body.days); 

        let user = await User.findOne({ tg_id: target_id });
        let expDate = user && user.sub_exp > Date.now() ? new Date(user.sub_exp) : new Date();
        expDate.setDate(expDate.getDate() + days);

        let cleanSub = (req.body.sub_type || "FREE").trim();
        if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra";
        else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP";
        else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro";
        else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium";

        await User.findOneAndUpdate({ tg_id: target_id }, { subscription: cleanSub, sub_exp: expDate.getTime() }, { upsert: true });
        
        await sendTgMessage(target_id, `Администратор выдал вам подписку ${cleanSub}`);
        res.json({ message: `Подписка выдана на ${days} дней` });
    } else {
        if (!isOwner) return res.status(403).json({ error: "Только Овнер может забирать подписку" });
        await User.findOneAndUpdate({ tg_id: target_id }, { subscription: "FREE", sub_exp: 0 }, { upsert: true });
        
        await sendTgMessage(target_id, `Администратор забрал вашу подписку`);
        res.json({ message: "Подписка аннулирована" });
    }
});

app.post('/api/admin/create-char', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет доступа" });
    await new Character(req.body.charData).save();
    res.json({ message: "Персонаж успешно добавлен!" });
});

app.post('/api/admin/delete-char', async (req, res) => {
    if (Number(req.body.sender_id) !== OWNER_ID) return res.status(403).json({ error: "Только Овнер может удалять персонажей" });
    await Character.findOneAndDelete({ id: req.body.char_id });
    res.json({ message: "Персонаж удален" });
});

app.post('/api/admin/create-promo', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет доступа" });
    await new Promo(req.body.promoData).save();
    res.json({ message: "Промокод успешно создан" });
});

app.post('/api/admin/delete-promo', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет доступа" });
    await Promo.findOneAndDelete({ code: req.body.code });
    res.json({ message: "Промокод удален" });
});

app.post('/api/admin/create-task', async (req, res) => {
    if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет доступа" });
    await new Task(req.body.taskData).save();
    res.json({ message: "Задание добавлено" });
});

app.post('/api/admin/delete-task', async (req, res) => {
    if (Number(req.body.sender_id) !== OWNER_ID) return res.status(403).json({ error: "Только Овнер может удалять задания" });
    await Task.findOneAndDelete({ id: req.body.task_id });
    res.json({ message: "Задание удалено" });
});

app.post('/api/owner/set-admin', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).json({ error: "Доступно только Овнеру" });
    
    await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, { is_admin: req.body.status }, { upsert: true });
    
    if (req.body.status) {
        await sendTgMessage(req.body.target_id, `Администратор сделал вас админом`);
    } else {
        await sendTgMessage(req.body.target_id, `Администратор забрал у вас права админа`);
    }
    
    res.json({ message: "Статус администратора обновлен" });
});

app.post('/api/owner/set-price', async (req, res) => {
    if (Number(req.body.sender_id) !== OWNER_ID) return res.status(403).json({ error: "Доступно только Овнеру" });
    const { item_id, stars, ton } = req.body;
    await Price.findOneAndUpdate({ item_id }, { stars: Number(stars), ton: Number(ton) }, { upsert: true });
    res.json({ message: "Прайс-лист успешно обновлен!" });
});

// Экспорт для Vercel
module.exports = app;

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`[SYSTEM] Сервер запущен на порту ${PORT}`));
}

