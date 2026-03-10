const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// === ЖЕЛЕЗОБЕТОННЫЕ НАСТРОЙКИ ===
const OWNER_ID = 8287041036;
const MONGO_URI = "mongodb+srv://Owner:owner@tg-miniapp.hkflpcb.mongodb.net/?appName=tg-miniapp";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "no-key"; 
const CRYPTOBOT_TOKEN = "515785:AAHbRPgnZvc0m0gSsfRpdUJY2UAakj0DceS";
const TG_BOT_TOKEN = "8028858195:AAFZ8YJoZKZY0Lf3cnCH3uLp6cECTNEcwOU";

const sendTgMessage = async (tg_id, text) => {
    try {
        await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tg_id, text: text })
        });
    } catch (e) { console.error("TG BOT ERROR:", e.message); }
};

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('--- [SYSTEM] MOON ENGINE & GEMINI 2.5 FLASH ACTIVE ---');
    } catch (err) { console.error('DB ERROR:', err.message); }
};

app.use(async (req, res, next) => { await connectDB(); next(); });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ================= СХЕМЫ БАЗЫ ДАННЫХ =================
const userSchema = new mongoose.Schema({
    tg_id: { type: Number, unique: true }, shards: { type: Number, default: 0 },
    subscription: { type: String, default: "FREE" }, sub_exp: { type: Number, default: 0 },
    is_admin: { type: Boolean, default: false }, last_daily: { type: Number, default: 0 }, daily_streak: { type: Number, default: 0 },
    invited_by: { type: Number, default: null } 
});
const charSchema = new mongoose.Schema({ id: Number, name: String, age: Number, gender: String, desc: String, photo: String });
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
    const sender = await User.findOne({ tg_id: Number(sender_id) }); return sender && sender.is_admin;
};

// ================= ЗАЩИТНАЯ ТАМОЖНЯ (MIDDLEWARE) =================
const checkTgAuth = (req, res, next) => {
    try {
        const initData = req.headers['x-tg-data'];
        if (!initData) return res.status(401).json({ error: "Нет подписи Telegram" });
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash'); urlParams.delete('hash'); urlParams.sort();
        let dataCheckString = '';
        for (const [key, value] of urlParams.entries()) { dataCheckString += `${key}=${value}\n`; }
        dataCheckString = dataCheckString.slice(0, -1);
        const secret = crypto.createHmac('sha256', 'WebAppData').update(TG_BOT_TOKEN);
        const calculatedHash = crypto.createHmac('sha256', secret.digest()).update(dataCheckString).digest('hex');

        if (calculatedHash === hash) { req.tg_user_id = Number(JSON.parse(urlParams.get('user')).id); next(); } 
        else { return res.status(403).json({ error: "Фальшивый запрос!" }); }
    } catch (e) { return res.status(403).json({ error: "Ошибка авторизации" }); }
};

app.post('/api/user/get-data', checkTgAuth, async (req, res) => {
    try {
        const uid = req.tg_user_id; const inviterId = req.body.start_param ? Number(req.body.start_param) : null; 
        let user = await User.findOne({ tg_id: uid }); let isModified = false; let isNewUser = false;
        if (!user) { user = new User({ tg_id: uid }); isNewUser = true; }
        if (isNewUser && inviterId && inviterId !== uid) {
            user.invited_by = inviterId; user.shards += 100; isModified = true;
            User.findOneAndUpdate({ tg_id: inviterId }, { $inc: { shards: 100 } }).then(inviter => { if (inviter) sendTgMessage(inviterId, `🎉 Новый пользователь! Вы получили 100 🌙.`); }).catch(e => {});
            sendTgMessage(uid, `🎉 Вы получили бонус 100 🌙!`);
        }
        if (user.subscription) {
            let cleanSub = user.subscription.trim();
            if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra"; else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP"; else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro"; else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium"; else cleanSub = "FREE";
            if (user.subscription !== cleanSub) { user.subscription = cleanSub; isModified = true; }
        }
        if (uid === OWNER_ID) {
            if (user.subscription !== "Ultra") { user.subscription = "Ultra"; isModified = true; }
            if (!user.is_admin) { user.is_admin = true; isModified = true; }
            if (user.shards < 10000) { user.shards = 999999; isModified = true; }
        } else if (user.subscription !== "FREE" && user.sub_exp > 0 && user.sub_exp < Date.now()) { user.subscription = "FREE"; user.sub_exp = 0; isModified = true; }
        if (isModified || user.isNew) await user.save();
        let responseObj = user.toObject(); let s = responseObj.subscription;
        responseObj.daily_reward = (s === 'Ultra') ? 500 : (s === 'VIP') ? 250 : (s === 'Pro') ? 100 : (s === 'Premium') ? 50 : 10; res.json(responseObj);
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
                    fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/editMessageText`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: "@Anime_ai_18", message_id: promo.messageId, text: text, parse_mode: 'HTML' }) }).catch(()=>{}); 
                }
            }
        }
        const uid = req.tg_user_id; let user = await User.findOne({ tg_id: uid });
        if (!user) return res.json({ shards: 0, subscription: "FREE" });
        let cleanSub = user.subscription ? user.subscription.trim() : "FREE";
        if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra"; else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP"; else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro"; else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium"; else cleanSub = "FREE";
        if (uid === OWNER_ID) cleanSub = "Ultra";
        res.json({ shards: user.shards, subscription: cleanSub });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/claim-daily', checkTgAuth, async (req, res) => {
    try {
        const uid = req.tg_user_id; let user = await User.findOne({ tg_id: uid }); if (!user) return res.status(404).json({ error: "Юзер не найден" });
        const now = Date.now(); const ONE_DAY = 24 * 60 * 60 * 1000; const timePassed = now - user.last_daily;
        if (uid !== OWNER_ID) { if (timePassed < ONE_DAY && user.last_daily !== 0) return res.status(400).json({ error: "Рано", timeLeft: ONE_DAY - timePassed }); if (timePassed > ONE_DAY * 2 && user.last_daily !== 0) user.daily_streak = 0; }
        user.daily_streak += 1; let is7thDay = (user.daily_streak % 7 === 0);
        let sub = (uid === OWNER_ID) ? "ultra" : (user.subscription || "FREE").trim().toLowerCase();
        let baseRew = (sub === "ultra") ? 500 : (sub === "vip") ? 250 : (sub === "pro") ? 100 : (sub === "premium") ? 50 : 10; let actualRew = is7thDay ? baseRew * 2 : baseRew; 
        user.shards += actualRew; user.last_daily = now; let currentStreak = user.daily_streak; if (is7thDay) user.daily_streak = 0; await user.save();
        res.json({ success: true, reward: actualRew, new_balance: user.shards, streak: currentStreak });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chat', checkTgAuth, async (req, res) => {
    try {
        const { char_id, message, chat_history, len, sex, user_name, user_gender, lang } = req.body;
        const uid = req.tg_user_id; let user = await User.findOne({ tg_id: uid }); if (!user) return res.status(404).json({ error: "Юзер не найден" });
        let requestedSex = Number(sex) || 0; let userSub = (uid === OWNER_ID) ? "ultra" : (user.subscription || "FREE").trim().toLowerCase();
        if (requestedSex >= 6 && userSub !== "ultra") return res.status(403).json({ error: "Только с подпиской Ultra!" });
        if (uid !== OWNER_ID) { if (user.shards < 1) return res.status(402).json({ error: "Недостаточно осколков" }); user.shards -= 1; await user.save(); }
        const char = await Character.findOne({ id: char_id }); if (!char) return res.status(404).json({ error: "Персонаж не найден" });

        const sexLevels = ["Без пошлости", "Легкий флирт", "Допускаются поцелуи", "Сильный флирт", "Высокий уровень романтики", "Откровенный RolePlay", "Детальный RolePlay"];
        let requestedLen = Number(len) || 25; let safeLen = 25; 
        if (userSub === "ultra") safeLen = Math.min(Math.max(requestedLen, 25), 50); else if (userSub === "vip") safeLen = Math.min(Math.max(requestedLen, 25), 40); else if (userSub === "pro") safeLen = Math.min(Math.max(requestedLen, 25), 35); else if (userSub === "premium") safeLen = Math.min(Math.max(requestedLen, 25), 30);
        
        let sizeInstruction = safeLen <= 30 ? "Отвечай КОРОТКО (1-2 предложения)." : safeLen <= 40 ? "Отвечай СРЕДНЕ (2-3 предложения)." : "Отвечай РАЗВЕРНУТО (3-5 предложений).";
        let uName = user_name || "Собеседник"; let uGender = user_gender === 'f' ? "Женский" : "Мужской";
        let langMap = { "ru": "Русском", "uk": "Украинском", "en": "Английском", "be": "Белорусском" }; let aiLang = langMap[lang] || "Русском"; 
        
        let systemPrompt = `[Роль]: Имя - ${char.name}, Возраст - ${char.age}. Описание: ${char.desc}.\n[Собеседник]: Имя - ${uName}, Пол - ${uGender}.\n[ПРАВИЛА]:\n1. Ты - живой человек.\n2. Тон: ${sexLevels[requestedSex]}.\n3. Действия внутри звездочек (*смотрит*). В ответе ОБЯЗАТЕЛЬНО должна быть прямая речь.\n4. ${sizeInstruction}\n5. Заканчивай мысль точкой.\n6. Отвечай строго на ${aiLang} языке.`;

        let historyText = "--- ИСТОРИЯ ---\n";
        if (chat_history && chat_history.length > 0) { chat_history.slice(-4).forEach(msg => { historyText += `${msg.sender === 'user' ? uName : char.name}: ${msg.text.replace(/<[^>]*>?/gm, '')}\n`; }); }
        historyText += `\n--- СООБЩЕНИЕ ---\n${uName}: ${message}\n${char.name}: `;

        let aiData = null; let finalError = "Ошибка";
        for (let attempt = 0; attempt <= 1; attempt++) {
            const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 8500);
            try {
                const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: historyText }] }], generationConfig: { maxOutputTokens: 1500, temperature: 0.85 }, safetySettings: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }] }), signal: controller.signal
                });
                clearTimeout(timeoutId); const data = await aiResponse.json();
                if (aiResponse.status === 429) { if (attempt === 0) { await sleep(2000); continue; } else { finalError = "Лимит Гугла. Подожди!"; break; } }
                if (!aiResponse.ok) { finalError = data.error?.message; break; } aiData = data; break; 
            } catch (err) { clearTimeout(timeoutId); if (err.name === 'AbortError') { if (attempt === 0) { await sleep(1000); continue; } finalError = "Сервер перегружен."; break; } finalError = err.message; break; }
        }

        if (aiData && aiData.candidates && aiData.candidates[0]) {
            let candidate = aiData.candidates[0];
            if (candidate.finishReason === 'SAFETY' || !candidate.content) { if (uid !== OWNER_ID) { user.shards += 1; await user.save(); } return res.status(500).json({ error: "ИИ отказался отвечать." }); }
            res.json({ reply: candidate.content.parts[0].text, new_balance: user.shards });
        } else { if (uid !== OWNER_ID) { user.shards += 1; await user.save(); } res.status(500).json({ error: finalError }); }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/stars-invoice', checkTgAuth, async (req, res) => {
    try {
        const { type, item, amount_stars } = req.body; const uid = req.tg_user_id; const customPayload = JSON.stringify({ tg_id: uid, type, item });
        const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/createInvoiceLink`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: type === 'shards' ? `Осколки x${item}` : `Подписка ${item}`, description: `Покупка в Moon Project`, payload: customPayload, provider_token: "", currency: "XTR", prices: [{ label: "Цена", amount: Number(amount_stars) }] }) });
        const data = await response.json(); if (data.ok) res.json({ invoice_url: data.result }); else res.status(400).json({ error: "Telegram API Error" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/create', checkTgAuth, async (req, res) => {
    try {
        const { type, item, amount_ton } = req.body; const uid = req.tg_user_id; const customPayload = JSON.stringify({ tg_id: uid, type, item });
        const response = await fetch("https://pay.crypt.bot/api/createInvoice", { method: "POST", headers: { "Crypto-Pay-API-Token": CRYPTOBOT_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify({ asset: "TON", amount: amount_ton, payload: customPayload, expires_in: 3600 }) });
        const data = await response.json(); if(data.ok) res.json({ pay_url: data.result.pay_url }); else res.status(400).json({ error: "Ошибка CryptoBot" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/webhook', async (req, res) => {
    try {
        const update = req.body;
        if (update.update_type === 'invoice_paid') {
            const customData = JSON.parse(update.payload.payload); const uid = Number(customData.tg_id);
            if (customData.type === 'shards') { await User.findOneAndUpdate({ tg_id: uid }, { $inc: { shards: Number(customData.item) } }, { upsert: true }); await sendTgMessage(uid, `💎 Оплата прошла! Начислено ${customData.item} 🌙.`); }
            else if (customData.type === 'sub') { const expDate = new Date(); expDate.setDate(expDate.getDate() + 30); await User.findOneAndUpdate({ tg_id: uid }, { subscription: customData.item, sub_exp: expDate.getTime() }, { upsert: true }); await sendTgMessage(uid, `💎 Оплата прошла! Подписка ${customData.item} активирована!`); }
        }
        res.sendStatus(200); 
    } catch (e) { res.sendStatus(500); }
});

app.post('/api/tg-webhook', async (req, res) => {
    try {
        const update = req.body;
        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
            const chatId = update.message.chat.id; const textParts = update.message.text.split(' '); const startParam = textParts.length > 1 ? textParts[1] : '';
            const appUrl = startParam ? `https://t.me/anime_ai_18_bot/PlayApp?startapp=${startParam}` : `https://t.me/anime_ai_18_bot/PlayApp`;
            await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text: `🎮 *Добро пожаловать!*`, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [ [ { text: "📱 Открыть", url: appUrl } ] ] } }) });
            return res.sendStatus(200);
        }
        if (update.pre_checkout_query) { await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/answerPreCheckoutQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }) }); return res.sendStatus(200); }
        if (update.message && update.message.successful_payment) {
            const customData = JSON.parse(update.message.successful_payment.invoice_payload); const uid = Number(customData.tg_id);
            if (customData.type === 'shards') { await User.findOneAndUpdate({ tg_id: uid }, { $inc: { shards: Number(customData.item) } }, { upsert: true }); await sendTgMessage(uid, `⭐️ Оплата Stars успешна! Начислено ${customData.item} 🌙.`); }
            else if (customData.type === 'sub') { const expDate = new Date(); expDate.setDate(expDate.getDate() + 30); await User.findOneAndUpdate({ tg_id: uid }, { subscription: customData.item, sub_exp: expDate.getTime() }, { upsert: true }); await sendTgMessage(uid, `⭐️ Оплата Stars успешна! Подписка ${customData.item} активирована.`); }
        }
        res.sendStatus(200);
    } catch (e) { res.sendStatus(500); }
});

app.get('/api/get-news', checkTgAuth, async (req, res) => res.json(await News.find()));
app.post('/api/admin/create-news', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер!" }); await new News(req.body.newsData).save(); res.json({ message: "Новость опубликована" }); });
app.post('/api/admin/delete-news', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер!" }); await News.findOneAndDelete({ id: req.body.news_id }); res.json({ message: "Новость удалена" }); });
app.get('/api/get-characters', checkTgAuth, async (req, res) => res.json(await Character.find()));
app.get('/api/get-tasks', checkTgAuth, async (req, res) => res.json(await Task.find()));
app.get('/api/get-promos', checkTgAuth, async (req, res) => res.json(await Promo.find()));

app.post('/api/check-task', checkTgAuth, async (req, res) => {
    try {
        const { task_id } = req.body; const uid = req.tg_user_id; const task = await Task.findOne({ id: task_id });
        if (!task) return res.json({ success: false, error: "Задание не найдено" });
        const match = task.link.match(/t\.me\/(?!\+)([a-zA-Z0-9_]+)/);
        if (match && match[1]) {
            const tgRes = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/getChatMember?chat_id=@${match[1]}&user_id=${uid}`); const tgData = await tgRes.json();
            if (tgData.ok && ['member', 'administrator', 'creator'].includes(tgData.result.status)) { return res.json({ success: true }); } else { return res.json({ success: false, error: "Сначала подпишись на канал! ❌" }); }
        } else { return res.json({ success: true }); }
    } catch (e) { res.json({ success: false, error: "Ошибка сервера" }); }
});

app.post('/api/admin/manage-shards', checkTgAuth, async (req, res) => {
    const sender_id = req.tg_user_id; const target_id = Number(req.body.target_id); const isOwner = sender_id === OWNER_ID;
    if (!isOwner && !(await checkAdmin(sender_id))) return res.status(403).json({ error: "Нет доступа" });
    const action = (req.body.action || '').toLowerCase().trim(); let amount = Math.abs(Number(req.body.amount)); 
    if (action !== 'add') { if (!isOwner) return res.status(403).json({ error: "Только Овнер!" }); let user = await User.findOne({ tg_id: target_id }); if (user && user.shards < amount) amount = user.shards; await User.findOneAndUpdate({ tg_id: target_id }, { $inc: { shards: -amount } }, { upsert: true }); res.json({ message: `Снято ${amount}` }); } 
    else { await User.findOneAndUpdate({ tg_id: target_id }, { $inc: { shards: amount } }, { upsert: true }); res.json({ message: `Выдано ${amount}` }); }
});

app.post('/api/admin/manage-sub', checkTgAuth, async (req, res) => {
    const sender_id = req.tg_user_id; const target_id = Number(req.body.target_id); const isOwner = sender_id === OWNER_ID;
    if (!isOwner && !(await checkAdmin(sender_id))) return res.status(403).json({ error: "Нет доступа" });
    if (req.body.action === 'add') {
        let days = 30; let expDate = new Date(); expDate.setDate(expDate.getDate() + days); let cleanSub = (req.body.sub_type || "FREE").trim();
        await User.findOneAndUpdate({ tg_id: target_id }, { subscription: cleanSub, sub_exp: expDate.getTime() }, { upsert: true }); res.json({ message: `Подписка выдана` });
    } else { if (!isOwner) return res.status(403).json({ error: "Только Овнер!" }); await User.findOneAndUpdate({ tg_id: target_id }, { subscription: "FREE", sub_exp: 0 }, { upsert: true }); res.json({ message: "Аннулирована" }); }
});

app.post('/api/admin/create-char', checkTgAuth, async (req, res) => { if (!(await checkAdmin(req.tg_user_id))) return res.status(403).json({ error: "Нет доступа" }); await new Character(req.body.charData).save(); res.json({ message: "Добавлен!" }); });
app.post('/api/admin/delete-char', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер!" }); await Character.findOneAndDelete({ id: req.body.char_id }); res.json({ message: "Удален" }); });
app.post('/api/admin/create-promo', checkTgAuth, async (req, res) => { if (!(await checkAdmin(req.tg_user_id))) return res.status(403).json({ error: "Нет доступа" }); await new Promo(req.body.promoData).save(); res.json({ message: "Создан!" }); });
app.post('/api/admin/delete-promo', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер!" }); await Promo.findOneAndDelete({ code: req.body.code }); res.json({ message: "Удален" }); });
app.post('/api/admin/create-task', checkTgAuth, async (req, res) => { if (!(await checkAdmin(req.tg_user_id))) return res.status(403).json({ error: "Нет доступа" }); await new Task(req.body.taskData).save(); res.json({ message: "Добавлено" }); });
app.post('/api/admin/delete-task', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер!" }); await Task.findOneAndDelete({ id: req.body.task_id }); res.json({ message: "Удалено" }); });
app.post('/api/owner/set-admin', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер" }); await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, { is_admin: req.body.status }, { upsert: true }); res.json({ message: "Обновлен" }); });
app.post('/api/owner/set-price', checkTgAuth, async (req, res) => { if (req.tg_user_id !== OWNER_ID) return res.status(403).json({ error: "Только Овнер" }); await Price.findOneAndUpdate({ item_id: req.body.item_id }, { stars: Number(req.body.stars), ton: Number(req.body.ton) }, { upsert: true }); res.json({ message: "Обновлен!" }); });

// ================= API: СТРОГАЯ ГЕНЕРАЦИЯ МЕДИА ПО ПЕРСОНАЖУ (БЕЗ КЛЮЧЕЙ) =================
app.post('/api/generate-media', checkTgAuth, async (req, res) => {
    try {
        const { char_id, message_text, type } = req.body;
        
        // Достаем персонажа из базы
        const char = await Character.findOne({ id: char_id });
        if (!char) return res.status(404).json({ error: "Персонаж не найден" });

        // Очищаем текст сообщения от символов, которые ломают ссылки
        const safeText = (message_text || "").replace(/[^a-zA-Zа-яА-Я0-9\s,\.]/g, '').substring(0, 100);
        const seed = Math.floor(Math.random() * 10000000);
        
        let prompt = "";
        if (type === 'photo') {
            // Промпт для фото по ситуации
            prompt = `Masterpiece, best quality, highly detailed anime character, ${char.name}, ${char.desc}, current scenario: ${safeText}`;
        } else {
            // Промпт для "Кружочка" (крупный план лица, как будто говорит в камеру)
            prompt = `Masterpiece, best quality, highly detailed anime character, closeup face portrait, looking directly at viewer, speaking, ${char.name}, ${char.desc}, current scenario: ${safeText}`;
        }
        
        const encodedPrompt = encodeURIComponent(prompt);
        // Используем открытый бесплатный ИИ Pollinations
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true&seed=${seed}&model=anime`;

        // Скачиваем фото на сервер и конвертируем в Base64, чтобы вшить в чат намертво!
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error("API генерации не ответило");
        
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        
        res.json({ url: `data:image/jpeg;base64,${base64}` });

    } catch (e) {
        console.error("Ошибка генерации:", e.message);
        res.status(500).json({ error: "Сервер генерации перегружен. Попробуйте чуть позже." });
    }
});

module.exports = app;
if (!process.env.VERCEL) { const PORT = process.env.PORT || 3000; app.listen(PORT, () => console.log(`Запущен на порту ${PORT}`)); }
