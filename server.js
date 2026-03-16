const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// === ЖЕЛЕЗОБЕТОННЫЕ НАСТРОЙКИ И АРХИТЕКТУРА ===
const OWNER_ID = 8287041036;
const DB_CHANNEL_ID = "-1003643359969"; // Твой закрытый канал-сейф

// Вставь свои реальные токены перед деплоем
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; 
const CRYPTOBOT_TOKEN = process.env.CRYPTOBOT_TOKEN || "515785:AAHbRPgnZvc0m0gSsfRpdUJY2UAakj0DceS";
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || "8028858195:AAFZ8YJoZKZY0Lf3cnCH3uLp6cECTNEcwOU";

// ================= ФУНКЦИИ ТЕЛЕГРАМА И БЭКАПА =================
const sendTgMessage = async (tg_id, text) => {
    try {
        await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tg_id, text: text })
        });
    } catch (e) { console.error("TG BOT ERROR:", e.message); }
};

// Функция тихого бэкапа в канал (вызывается при важных изменениях)
const backupToTelegramChannel = async (dataType, data) => {
    try {
        const backupText = `📦 BACKUP: ${dataType}\nTIME: ${new Date().toISOString()}\n\n<code>${JSON.stringify(data).substring(0, 3800)}</code>`;
        await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: DB_CHANNEL_ID, text: backupText, parse_mode: 'HTML' })
        });
    } catch (e) { console.error("BACKUP ERROR:", e.message); }
};

// ================= ПОДКЛЮЧЕНИЕ БАЗЫ (ОПЕРАТИВКА) =================
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('--- [SYSTEM] MOON ENGINE & DB ACTIVE ---');
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
    daily_streak: { type: Number, default: 0 },
    invited_by: { type: Number, default: null } 
});

const charSchema = new mongoose.Schema({ 
    id: Number, name: String, age: Number, gender: String, desc: String, photo: String,
    creator_id: { type: Number, default: 0 }, status: { type: String, default: "public" }, char_type: { type: String, default: "official" } 
});

const promoSchema = new mongoose.Schema({ code: { type: String, unique: true }, reward: Number, expiresAt: Number, messageId: Number, emoji: String });
const taskSchema = new mongoose.Schema({ id: Number, name: String, link: String, rType: String, rVal: Number });
const priceSchema = new mongoose.Schema({ item_id: { type: String, unique: true }, stars: { type: Number, default: 0 }, ton: { type: Number, default: 0 } });
const newsSchema = new mongoose.Schema({ id: Number, text: String, photo: String });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Character = mongoose.models.Character || mongoose.model('Character', charSchema);
const Promo = mongoose.models.Promo || mongoose.model('Promo', promoSchema);
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
const Price = mongoose.models.Price || mongoose.model('Price', priceSchema);
const News = mongoose.models.News || mongoose.model('News', newsSchema);

const checkAdmin = async (sender_id) => {
    if (Number(sender_id) === OWNER_ID) return true;
    const sender = await User.findOne({ tg_id: Number(sender_id) }); 
    return sender && sender.is_admin;
};

// ================= ЗАЩИТНАЯ ТАМОЖНЯ (MIDDLEWARE) =================
const checkTgAuth = (req, res, next) => {
    try {
        const initData = req.headers['x-tg-data'];
        if (!initData) return res.status(401).json({ error: "Нет подписи Telegram" });
        if (initData === "dev_mode") { req.tg_user_id = OWNER_ID; return next(); } // Для локальных тестов
        
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        urlParams.sort();
        let dataCheckString = '';
        for (const [key, value] of urlParams.entries()) { dataCheckString += `${key}=${value}\n`; }
        dataCheckString = dataCheckString.slice(0, -1);
        const secret = crypto.createHmac('sha256', 'WebAppData').update(TG_BOT_TOKEN);
        const calculatedHash = crypto.createHmac('sha256', secret.digest()).update(dataCheckString).digest('hex');
        if (calculatedHash === hash) {
            const userObj = JSON.parse(urlParams.get('user'));
            req.tg_user_id = Number(userObj.id); 
            next();
        } else { return res.status(403).json({ error: "Фальшивый запрос!" }); }
    } catch (e) { return res.status(403).json({ error: "Ошибка авторизации" }); }
};

// ================= API: ПРОФИЛЬ И СИНХРОНИЗАЦИЯ =================
app.post('/api/user/get-data', checkTgAuth, async (req, res) => {
    try {
        const uid = req.tg_user_id; 
        const inviterId = req.body.start_param ? Number(req.body.start_param) : null; 
        let user = await User.findOne({ tg_id: uid }); 
        let isModified = false, isNewUser = false;
        
        if (!user) { user = new User({ tg_id: uid }); isNewUser = true; }

        if (isNewUser && inviterId && inviterId !== uid) {
            let inviter = await User.findOne({ tg_id: inviterId });
            if (inviter) {
                user.invited_by = inviterId; user.shards += 100; isModified = true;
                inviter.shards += 100; await inviter.save();
                await sendTgMessage(inviterId, `🎉 По вашей ссылке зарегистрировался новый пользователь! Вы получили 100 🌙.`);
            }
        }

        // Жесткая логика Овнера
        if (uid === OWNER_ID) {
            user.subscription = "Ultra"; 
            user.is_admin = true;
            if (user.shards < 10000) user.shards = 999999;
            isModified = true;
        } else if (user.subscription !== "FREE" && user.sub_exp > 0 && user.sub_exp < Date.now()) {
            user.subscription = "FREE"; user.sub_exp = 0; isModified = true;
        }
        
        if (isModified || user.isNew) {
            await user.save();
            if(isNewUser) backupToTelegramChannel("NEW_USER", { id: uid, time: new Date() });
        }
        
        let responseObj = user.toObject();
        let s = responseObj.subscription;
        responseObj.daily_reward = (s === 'Ultra') ? 500 : (s === 'VIP') ? 250 : (s === 'Pro') ? 100 : (s === 'Premium') ? 50 : 10;
        
        res.json(responseObj);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/sync', checkTgAuth, async (req, res) => {
    try {
        const expiredPromos = await Promo.find({ expiresAt: { $lte: Date.now() } });
        if (expiredPromos.length > 0) {
            for (let promo of expiredPromos) {
                await Promo.deleteOne({ _id: promo._id });
                if (promo.messageId) {
                    const text = `${promo.emoji}\nПромокод «<s>${promo.code}</s>» даёт ${promo.reward} осколков\nUPD: промокод закончился`;
                    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/editMessageText`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: "@Anime_ai_18", message_id: promo.messageId, text: text, parse_mode: 'HTML' })
                    }).catch(()=>{}); 
                }
            }
        }

        const uid = req.tg_user_id; let user = await User.findOne({ tg_id: uid });
        if (!user) return res.json({ shards: 0, subscription: "FREE" });
        
        let cleanSub = user.subscription ? user.subscription.trim() : "FREE";
        if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra"; else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP";
        else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro"; else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium"; else cleanSub = "FREE";
        if (uid === OWNER_ID) cleanSub = "Ultra";

        res.json({ shards: user.shards, subscription: cleanSub });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/claim-daily', checkTgAuth, async (req, res) => {
    try {
        const uid = req.tg_user_id; let user = await User.findOne({ tg_id: uid });
        const now = Date.now(), ONE_DAY = 24 * 60 * 60 * 1000, timePassed = now - user.last_daily;
        
        if (uid !== OWNER_ID && timePassed < ONE_DAY && user.last_daily !== 0) return res.status(400).json({ error: "Рано" });
        
        user.daily_streak += 1; 
        let is7thDay = (user.daily_streak % 7 === 0);
        let sub = (uid === OWNER_ID) ? "ultra" : (user.subscription || "FREE").trim().toLowerCase();
        
        // Точная выдача по подписке
        let baseRew = (sub === "ultra") ? 500 : (sub === "vip") ? 250 : (sub === "pro") ? 100 : (sub === "premium") ? 50 : 10;
        let actualRew = is7thDay ? baseRew * 2 : baseRew; 
        
        user.shards += actualRew; 
        user.last_daily = now;
        if (is7thDay) user.daily_streak = 0; 
        await user.save();
        
        res.json({ success: true, reward: actualRew, new_balance: user.shards, streak: user.daily_streak });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================= API: СИСТЕМА ПЕРСОНАЖЕЙ =================
app.get('/api/user/my-chars', checkTgAuth, async (req, res) => {
    try { res.json(await Character.find({ creator_id: req.tg_user_id, char_type: 'custom' })); } 
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/create-custom-char', checkTgAuth, async (req, res) => {
    try {
        const uid = req.tg_user_id; let user = await User.findOne({ tg_id: uid });
        if (!user) return res.status(404).json({ error: "Юзер не найден" });
        
        let cost = req.body.cost || 100;
        if (user.shards < cost && uid !== OWNER_ID) return res.status(400).json({ error: `Недостаточно осколков. Цена: ${cost} 🌙` });
        if (uid !== OWNER_ID) { user.shards -= cost; await user.save(); }
        
        const charData = req.body.charData;
        charData.id = Date.now(); charData.creator_id = uid; charData.status = "private"; charData.char_type = "custom";
        await new Character(charData).save();
        
        backupToTelegramChannel("NEW_CUSTOM_CHAR", charData);
        res.json({ message: `Персонаж успешно создан!\nПотрачено: ${cost} 🌙`, new_balance: user.shards });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/edit-custom-char', checkTgAuth, async (req, res) => {
    try {
        const uid = req.tg_user_id; const { char_id, charData } = req.body;
        let char = await Character.findOne({ id: char_id, creator_id: uid, char_type: 'custom' });
        if (!char) return res.status(403).json({ error: "Персонаж не найден или нет доступа" });
        
        char.name = charData.name; char.age = charData.age; char.gender = charData.gender; char.desc = charData.desc;
        if (charData.photo) char.photo = charData.photo;
        await char.save(); res.json({ message: "Персонаж успешно обновлен!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/submit-char', checkTgAuth, async (req, res) => {
    try {
        const uid = req.tg_user_id;
        let char = await Character.findOne({ id: req.body.char_id, creator_id: uid, char_type: 'custom' });
        if (!char || char.status === "public" || char.status === "pending") return res.status(400).json({ error: "Ошибка статуса" });
        
        char.status = "pending"; await char.save();
        const admins = await User.find({ is_admin: true });
        const adminIds = [...new Set([OWNER_ID, ...admins.map(a => a.tg_id)])];
        for (let adminId of adminIds) {
            await sendTgMessage(adminId, `🆕 Пользователь (${uid}) предложил персонажа "${char.name}" в базу!\n👉 Админ-панель -> Модерация.`);
        }
        res.json({ message: "Отправлено на проверку!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================= API: ЧАТ С ИИ =================
app.post('/api/chat', checkTgAuth, async (req, res) => {
    try {
        const { char_id, message, chat_history, len, sex, user_name, user_gender, lang } = req.body;
        const uid = req.tg_user_id; let user = await User.findOne({ tg_id: uid });
        
        if (uid !== OWNER_ID) {
            if (user.shards < 1) return res.status(402).json({ error: "Недостаточно осколков" });
            user.shards -= 1; await user.save(); 
        }

        const char = await Character.findOne({ id: char_id });
        const sexLevels = [
            "Strictly SFW. Polite, friendly tone. No NSFW. Zero explicit content.",
            "Light romance, gentle flirting. Hugs and blushes. Keep it safe.",
            "Romantic Roleplay. Kisses, deep affection, heavy petting. PG-13 limits.",
            "Spicy Roleplay. Intense flirting, sexual tension, hot make-out sessions.",
            "Passionate NSFW. Foreplay, undressing, erotic touch. Steamy content allowed.",
            "Explicit NSFW. Vivid and detailed descriptions of intimate sexual acts. Uncensored.",
            "Extreme Hardcore NSFW. No boundaries, absolutely explicit, dirty talk, unapologetic."
        ];
        
        let uName = (user_name && user_name !== "...") ? user_name : "User";
        let uGender = (user_gender === 'Female' || user_gender === 'Женский' || user_gender === 'f') ? "Female" : "Male";
        let aiLangName = lang === "uk" ? "Ukrainian" : (lang === "en" ? "English" : "Russian");

        let systemPrompt = `You are a character in an immersive Text Roleplay.
[CHARACTER INFO] Name: ${char.name}, Age: ${char.age}, Personality: ${char.desc}
[USER INFO] Name: ${uName}, Gender: ${uGender}
[SETTINGS] Lewdness Level: ${sexLevels[sex || 0]}. Target Word Count: ~${len || 25} words.
[RULES] 1. Speak ONLY in ${aiLangName.toUpperCase()}. 2. Wrap actions in *asterisks*. 3. React to User actions. 4. Never break character.`;

        let messages = [{ role: "system", content: systemPrompt }];
        if (chat_history) chat_history.slice(-10).forEach(m => messages.push({ role: m.sender === 'user' ? "user" : "assistant", content: m.text }));
        messages.push({ role: "user", content: message });

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST", headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "sophosympatheia/midnight-miqu-70b-v1.5", messages: messages, temperature: 0.9, max_tokens: parseInt(len || 25) * 5 })
        });
        const data = await aiResponse.json();
        
        if (data.choices && data.choices[0]) {
            res.json({ reply: data.choices[0].message.content, new_balance: user.shards });
        } else throw new Error("API Error");
    } catch (e) { res.status(500).json({ error: "Ошибка ИИ." }); }
});

// ================= API: ОПЛАТА =================
app.post('/api/payment/stars-invoice', checkTgAuth, async (req, res) => {
    try {
        const { type, item, amount_stars } = req.body;
        const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/createInvoiceLink`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: `Покупка ${item}`, description: "Moon Shards/Sub", payload: JSON.stringify({ tg_id: req.tg_user_id, type, item }), provider_token: "", currency: "XTR", prices: [{ label: "Цена", amount: Number(amount_stars) }] })
        });
        const data = await response.json();
        if (data.ok) res.json({ invoice_url: data.result }); else res.status(400).json({ error: "TG Error" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/create', checkTgAuth, async (req, res) => {
    try {
        const customPayload = JSON.stringify({ tg_id: req.tg_user_id, type: req.body.type, item: req.body.item });
        const response = await fetch("https://pay.crypt.bot/api/createInvoice", {
            method: "POST", headers: { "Crypto-Pay-API-Token": CRYPTOBOT_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({ asset: "TON", amount: req.body.amount_ton, payload: customPayload, expires_in: 3600 })
        });
        const data = await response.json();
        if(data.ok) res.json({ pay_url: data.result.pay_url }); else res.status(400).json({ error: "Ошибка CryptoBot" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================= АДМИНКА И КОНСОЛЬ (СТРОГО ПО ПРАВИЛАМ) =================
app.get('/api/get-news', checkTgAuth, async (req, res) => res.json(await News.find()));
app.post('/api/admin/create-news', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер!" }); await new News(req.body.newsData).save(); backupToTelegramChannel("NEWS", req.body.newsData); res.json({ message: "Опубликовано" }); });
app.post('/api/admin/delete-news', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер!" }); await News.findOneAndDelete({ id: req.body.news_id }); res.json({ message: "Удалено" }); });

app.get('/api/get-characters', checkTgAuth, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache');
    res.json(await Character.find({ $or: [{ char_type: 'official' }, { char_type: 'custom', status: 'public' }, { char_type: { $exists: false } }] }));
});

app.get('/api/admin/get-pending-chars', checkTgAuth, async (req, res) => {
    if (!(await checkAdmin(req.tg_user_id))) return res.status(403).json({ error: "Нет доступа" });
    res.json(await Character.find({ status: 'pending' }));
});

app.post('/api/admin/moderate-char', checkTgAuth, async (req, res) => {
    if (!(await checkAdmin(req.tg_user_id))) return res.status(403).json({ error: "Нет доступа" });
    const { char_id, action, reason } = req.body; let char = await Character.findOne({ id: char_id });
    if (!char) return res.status(404).json({ error: "Персонаж не найден" });
    if (action === 'approve') {
        char.status = 'public'; await char.save();
        await sendTgMessage(char.creator_id, `🎉 Ваш персонаж "${char.name}" прошел модерацию!`);
        backupToTelegramChannel("APPROVED_CHAR", char); res.json({ message: "Одобрено" });
    } else {
        char.status = 'private'; await char.save();
        await sendTgMessage(char.creator_id, `😔 Персонаж "${char.name}" отклонен.\nПричина: ${reason}`); res.json({ message: "Отклонено" });
    }
});

app.get('/api/get-tasks', checkTgAuth, async (req, res) => res.json(await Task.find()));
app.get('/api/get-promos', checkTgAuth, async (req, res) => res.json(await Promo.find()));

// УПРАВЛЕНИЕ ЗАДАНИЯМИ: Админ добавляет, Овнер добавляет и удаляет
app.post('/api/admin/create-task', checkTgAuth, async (req, res) => { if (!(await checkAdmin(req.tg_user_id))) return res.status(403).json({ error: "Нет доступа" }); await new Task(req.body.taskData).save(); res.json({ message: "Добавлено" }); });
app.post('/api/admin/delete-task', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер может удалять!" }); await Task.findOneAndDelete({ id: req.body.task_id }); res.json({ message: "Удалено" }); });

// УПРАВЛЕНИЕ ПРОМОКОДАМИ: Могут оба
app.post('/api/admin/create-promo', checkTgAuth, async (req, res) => { 
    if (!(await checkAdmin(req.tg_user_id))) return res.status(403).json({ error: "Нет доступа" }); 
    let { code, reward, hours } = req.body.promoData; hours = Number(hours) || 1;
    const expiresAt = Date.now() + (hours * 60 * 60 * 1000); 
    await new Promo({ code, reward, expiresAt, emoji: "🎁" }).save(); res.json({ message: "Создан" }); 
});
app.post('/api/admin/delete-promo', checkTgAuth, async (req, res) => { if (!(await checkAdmin(req.tg_user_id))) return res.status(403).json({ error: "Нет доступа" }); await Promo.findOneAndDelete({ code: req.body.code }); res.json({ message: "Удален" }); });

// УПРАВЛЕНИЕ ОСКОЛКАМИ И ПОДПИСКАМИ: Выдача строго по ID
app.post('/api/admin/manage-shards', checkTgAuth, async (req, res) => {
    const sender_id = req.tg_user_id; const target_id = Number(req.body.target_id); const isOwner = sender_id === OWNER_ID;
    if (!isOwner && !(await checkAdmin(sender_id))) return res.status(403).json({ error: "Нет доступа" });
    const action = req.body.action; let amount = Math.abs(Number(req.body.amount)); 
    
    if (action !== 'add') {
        if (!isOwner) return res.status(403).json({ error: "Овнер онли" });
        await User.findOneAndUpdate({ tg_id: target_id }, { $inc: { shards: -amount } }, { upsert: true }); res.json({ message: `Снято` });
    } else { 
        await User.findOneAndUpdate({ tg_id: target_id }, { $inc: { shards: amount } }, { upsert: true }); res.json({ message: `Выдано` }); 
    }
});

app.post('/api/admin/manage-sub', checkTgAuth, async (req, res) => {
    const sender_id = req.tg_user_id; const target_id = Number(req.body.target_id); const isOwner = sender_id === OWNER_ID;
    if (!isOwner && !(await checkAdmin(sender_id))) return res.status(403).json({ error: "Нет доступа" });
    if (req.body.action === 'add') {
        // Подписка строго на 30 дней, как ты просил. Овнер может задать свой срок (days).
        let days = 30; if (isOwner && req.body.days) days = Number(req.body.days); 
        let user = await User.findOne({ tg_id: target_id }); let expDate = user && user.sub_exp > Date.now() ? new Date(user.sub_exp) : new Date(); expDate.setDate(expDate.getDate() + days);
        await User.findOneAndUpdate({ tg_id: target_id }, { subscription: req.body.sub_type, sub_exp: expDate.getTime() }, { upsert: true }); res.json({ message: `Выдано` });
    } else {
        if (!isOwner) return res.status(403).json({ error: "Овнер онли" });
        await User.findOneAndUpdate({ tg_id: target_id }, { subscription: "FREE", sub_exp: 0 }, { upsert: true }); res.json({ message: "Аннулировано" });
    }
});

// АДМИНЫ ПО ID (ТОЛЬКО ОВНЕР)
app.post('/api/owner/set-admin', checkTgAuth, async (req, res) => { 
    if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер" }); 
    await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, { is_admin: req.body.status }, { upsert: true }); res.json({ message: "Обновлено" }); 
});

module.exports = app;
if (!process.env.VERCEL) { const PORT = process.env.PORT || 3000; app.listen(PORT, () => console.log(`[LOCAL] Port ${PORT}`)); }
