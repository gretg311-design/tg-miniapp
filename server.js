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

// БЕЗОПАСНЫЙ КЛЮЧ VERCEL ДЛЯ GOOGLE GEMINI
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
        console.log('--- [SYSTEM] MOON ENGINE & GEMINI 1.5 FLASH ACTIVE ---');
    } catch (err) { console.error('DB ERROR:', err.message); }
};

app.use(async (req, res, next) => { await connectDB(); next(); });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ================= СХЕМЫ БАЗЫ ДАННЫХ =================
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

const checkAdmin = async (sender_id) => {
    if (Number(sender_id) === OWNER_ID) return true;
    const sender = await User.findOne({ tg_id: Number(sender_id) }); return sender && sender.is_admin;
};

// ================= API: ПРОФИЛЬ И ЮЗЕРЫ =================
app.post('/api/user/get-data', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id);
        let user = await User.findOne({ tg_id: uid }); if (!user) user = new User({ tg_id: uid });
        let isModified = false;

        if (user.subscription) {
            let cleanSub = user.subscription.trim();
            if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra"; else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP";
            else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro"; else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium"; else cleanSub = "FREE";
            if (user.subscription !== cleanSub) { user.subscription = cleanSub; isModified = true; }
        }

        if (uid === OWNER_ID) {
            if (user.subscription !== "Ultra") { user.subscription = "Ultra"; isModified = true; }
            if (!user.is_admin) { user.is_admin = true; isModified = true; }
            if (user.shards < 10000) { user.shards = 999999; isModified = true; }
        } else if (user.subscription !== "FREE" && user.sub_exp > 0 && user.sub_exp < Date.now()) {
            user.subscription = "FREE"; user.sub_exp = 0; isModified = true;
        }

        if (isModified || user.isNew) await user.save();
        let responseObj = user.toObject(); let s = responseObj.subscription;
        responseObj.daily_reward = (s === 'Ultra') ? 500 : (s === 'VIP') ? 250 : (s === 'Pro') ? 150 : (s === 'Premium') ? 50 : 10;
        res.json(responseObj);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/sync', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id); let user = await User.findOne({ tg_id: uid });
        if (!user) return res.json({ shards: 0, subscription: "FREE" });
        let cleanSub = user.subscription ? user.subscription.trim() : "FREE";
        if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra"; else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP";
        else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro"; else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium"; else cleanSub = "FREE";
        if (uid === OWNER_ID) cleanSub = "Ultra";
        res.json({ shards: user.shards, subscription: cleanSub });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/claim-daily', async (req, res) => {
    try {
        const uid = Number(req.body.tg_id); let user = await User.findOne({ tg_id: uid });
        if (!user) return res.status(404).json({ error: "Юзер не найден" });
        const now = Date.now(); const ONE_DAY = 24 * 60 * 60 * 1000; const timePassed = now - user.last_daily;

        if (uid !== OWNER_ID) {
            if (timePassed < ONE_DAY && user.last_daily !== 0) return res.status(400).json({ error: "Рано", timeLeft: ONE_DAY - timePassed });
            if (timePassed > ONE_DAY * 2 && user.last_daily !== 0) user.daily_streak = 0;
        }

        user.daily_streak += 1; let is7thDay = (user.daily_streak % 7 === 0);
        let sub = (uid === OWNER_ID) ? "ultra" : (user.subscription || "FREE").trim().toLowerCase();
        let baseRew = (sub === "ultra") ? 500 : (sub === "vip") ? 250 : (sub === "pro") ? 150 : (sub === "premium") ? 50 : 10;
        let actualRew = is7thDay ? baseRew * 2 : baseRew; 

        user.shards += actualRew; user.last_daily = now; let currentStreak = user.daily_streak;
        if (is7thDay) user.daily_streak = 0; 
        await user.save();
        res.json({ success: true, reward: actualRew, new_balance: user.shards, streak: currentStreak });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================= API: ЧАТ (НАДЕЖНЫЙ GEMINI 1.5 FLASH) =================
app.post('/api/chat', async (req, res) => {
    try {
        const { tg_id, char_id, message, chat_history, len, sex, user_name, user_gender } = req.body;
        const uid = Number(tg_id);
        let user = await User.findOne({ tg_id: uid });
        if (!user) return res.status(404).json({ error: "Юзер не найден в БД" });

        let requestedSex = Number(sex) || 0;
        let userSub = (uid === OWNER_ID) ? "ultra" : (user.subscription || "FREE").trim().toLowerCase();
        
        if (requestedSex >= 6 && userSub !== "ultra") return res.status(403).json({ error: "6 уровень откровенности доступен только с подпиской Ultra!" });

        if (uid !== OWNER_ID) {
            if (user.shards < 1) return res.status(402).json({ error: "Недостаточно осколков" });
            user.shards -= 1; await user.save(); 
        }

        const char = await Character.findOne({ id: char_id });
        if (!char) return res.status(404).json({ error: "Персонаж не найден в БД" });

        const sexLevels = [
            "Строго без пошлости. Игнорируй любые намеки на интим.", 
            "Слабая романтика, легкий флирт.", 
            "Нормальный уровень общения, допускаются поцелуи и объятия.", 
            "Сильный флирт, романтические намеки.", 
            "Страсть, высокий уровень романтики.", 
            "Откровенный RolePlay.", 
            "Детальный RolePlay." 
        ];
        
        let safeLen = Number(len) || 45;
        let uName = user_name || "Собеседник";
        let uGender = user_gender || "Не указан";
        
        let systemPrompt = `Ты в RolePlay чате. Твоя роль: Имя - ${char.name}, Возраст - ${char.age}. Легенда: ${char.desc}.
Твой собеседник: Имя - ${uName}, Пол - ${uGender}. Обращайся к нему по имени.

ПРАВИЛА, КОТОРЫЕ ТЫ ОБЯЗАН СТРОГО СОБЛЮДАТЬ:
1. ЖИВАЯ РЕЧЬ: Ты живой человек! КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО вести себя как бот-помощник или ассистент.
2. Тон общения: ${sexLevels[requestedSex]}.
3. ДЛИНА ОТВЕТА: Пиши развернуто и красочно, описывай окружение. МИНИМУМ 3-4 предложения (не менее ${safeLen} слов). 
4. ДЕЙСТВИЯ: Все свои действия, эмоции и мысли СТРОГО пиши внутри звездочек (например: *нежно улыбается*).
5. РЕЧЬ: Прямую речь пиши обычным текстом без звездочек.
6. ЗАПРЕТ: Не играй за пользователя. Пиши только за своего персонажа.`;

        // Урезали историю до 4 последних сообщений, чтобы не напрягать лимиты Гугла
        let historyText = "--- ИСТОРИЯ ДИАЛОГА ---\n";
        if (chat_history && chat_history.length > 0) {
            let recentHistory = chat_history.slice(-4); 
            recentHistory.forEach(msg => { 
                let speaker = msg.sender === 'user' ? uName : char.name;
                historyText += `${speaker}: ${msg.text || "..."}\n`;
            });
        }
        historyText += `\n--- НОВОЕ СООБЩЕНИЕ ---\n${uName}: ${message}\n${char.name}: `;

        let aiData = null;
        let finalError = "Неизвестная ошибка";

        for (let attempt = 0; attempt <= 1; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8500);

            try {
                // ИСПРАВЛЕНО НА GEMINI 1.5 FLASH (Безотказная версия)
                const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: [{ role: "user", parts: [{ text: historyText }] }],
                        generationConfig: { maxOutputTokens: 1000, temperature: 0.85 },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                        ]
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                const data = await aiResponse.json();

                if (aiResponse.status === 429) {
                    if (attempt === 0) {
                        await sleep(2000); 
                        continue; 
                    } else {
                        finalError = "Лимит сообщений. Подожди 30 секунд!";
                        break;
                    }
                }

                if (!aiResponse.ok) {
                    finalError = data.error?.message || `Ошибка API ${aiResponse.status}`;
                    break; 
                }

                aiData = data;
                break; 

            } catch (err) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    if (attempt === 0) { await sleep(1000); continue; }
                    finalError = "Сервер перегружен.";
                    break;
                }
                finalError = `Сбой сети: ${err.message}`;
                break;
            }
        }

        if (aiData && aiData.candidates && aiData.candidates[0]) {
            let candidate = aiData.candidates[0];
            
            if (candidate.finishReason === 'SAFETY' || !candidate.content) {
                if (uid !== OWNER_ID) { user.shards += 1; await user.save(); }
                return res.status(500).json({ error: "ИИ отказался отвечать на эту тему." });
            }

            const replyText = candidate.content.parts[0].text;
            res.json({ reply: replyText, new_balance: user.shards });
        } else {
            if (uid !== OWNER_ID) { user.shards += 1; await user.save(); }
            res.status(500).json({ error: finalError });
        }

    } catch (e) { 
        res.status(500).json({ error: "Критическая ошибка: " + e.message }); 
    }
});

// ================= API: ОПЛАТА =================
app.post('/api/payment/stars-invoice', async (req, res) => {
    try {
        const { tg_id, type, item, amount_stars } = req.body;
        const customPayload = JSON.stringify({ tg_id: Number(tg_id), type, item });
        const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/createInvoiceLink`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: type === 'shards' ? `Осколки Луны x${item}` : `Подписка ${item}`, description: type === 'shards' ? `Начисление ${item} 🌙 на ваш баланс` : `Премиум функции и награды на 30 дней`, payload: customPayload, provider_token: "", currency: "XTR", prices: [{ label: "Цена", amount: Number(amount_stars) }] })
        });
        const data = await response.json();
        if (data.ok) res.json({ invoice_url: data.result }); else res.status(400).json({ error: "Telegram API Error" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/create', async (req, res) => {
    try {
        const { tg_id, type, item, amount_ton } = req.body;
        const customPayload = JSON.stringify({ tg_id: Number(tg_id), type, item });
        const response = await fetch("https://pay.crypt.bot/api/createInvoice", {
            method: "POST", headers: { "Crypto-Pay-API-Token": CRYPTOBOT_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({ asset: "TON", amount: amount_ton, payload: customPayload, expires_in: 3600 })
        });
        const data = await response.json();
        if(data.ok) res.json({ pay_url: data.result.pay_url }); else res.status(400).json({ error: "Ошибка CryptoBot" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment/webhook', async (req, res) => {
    try {
        const update = req.body;
        if (update.update_type === 'invoice_paid') {
            const customData = JSON.parse(update.payload.payload); const uid = Number(customData.tg_id);
            if (customData.type === 'shards') { await User.findOneAndUpdate({ tg_id: uid }, { $inc: { shards: Number(customData.item) } }, { upsert: true }); await sendTgMessage(uid, `💎 TON Оплата прошла! Вам начислено ${customData.item} 🌙.`); }
            else if (customData.type === 'sub') { const expDate = new Date(); expDate.setDate(expDate.getDate() + 30); await User.findOneAndUpdate({ tg_id: uid }, { subscription: customData.item, sub_exp: expDate.getTime() }, { upsert: true }); await sendTgMessage(uid, `💎 TON Оплата прошла! Ваша подписка ${customData.item} активирована!`); }
        }
        res.sendStatus(200); 
    } catch (e) { res.sendStatus(500); }
});

app.post('/api/tg-webhook', async (req, res) => {
    try {
        const update = req.body;
        if (update.pre_checkout_query) {
            await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/answerPreCheckoutQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }) });
            return res.sendStatus(200);
        }
        if (update.message && update.message.successful_payment) {
            const customData = JSON.parse(update.message.successful_payment.invoice_payload); const uid = Number(customData.tg_id);
            if (customData.type === 'shards') { await User.findOneAndUpdate({ tg_id: uid }, { $inc: { shards: Number(customData.item) } }, { upsert: true }); await sendTgMessage(uid, `⭐️ Оплата Stars успешна! Начислено ${customData.item} 🌙.`); }
            else if (customData.type === 'sub') { const expDate = new Date(); expDate.setDate(expDate.getDate() + 30); await User.findOneAndUpdate({ tg_id: uid }, { subscription: customData.item, sub_exp: expDate.getTime() }, { upsert: true }); await sendTgMessage(uid, `⭐️ Оплата Stars успешна! Подписка ${customData.item} активирована.`); }
        }
        res.sendStatus(200);
    } catch (e) { res.sendStatus(500); }
});

// ================= АДМИНКА =================
app.get('/api/get-characters', async (req, res) => res.json(await Character.find()));
app.get('/api/get-tasks', async (req, res) => res.json(await Task.find()));
app.get('/api/get-promos', async (req, res) => res.json(await Promo.find()));

app.post('/api/admin/manage-shards', async (req, res) => {
    const sender_id = Number(req.body.sender_id); const target_id = Number(req.body.target_id); const isOwner = sender_id === OWNER_ID;
    if (!isOwner && !(await checkAdmin(sender_id))) return res.status(403).json({ error: "Нет доступа" });
    const action = (req.body.action || '').toLowerCase().trim(); let amount = Math.abs(Number(req.body.amount)); 

    if (action !== 'add' || Number(req.body.amount) < 0) {
        if (!isOwner) return res.status(403).json({ error: "Только Овнер может забирать осколки" });
        let user = await User.findOne({ tg_id: target_id }); if (user && user.shards < amount) amount = user.shards; 
        await User.findOneAndUpdate({ tg_id: target_id }, { $inc: { shards: -amount } }, { upsert: true }); await sendTgMessage(target_id, `Администратор забрал у вас ${amount} токенов`); res.json({ message: `Снято ${amount} осколков` });
    } else {
        await User.findOneAndUpdate({ tg_id: target_id }, { $inc: { shards: amount } }, { upsert: true }); await sendTgMessage(target_id, `Администратор выдал вам ${amount} токенов`); res.json({ message: `Выдано ${amount} осколков` });
    }
});

app.post('/api/admin/manage-sub', async (req, res) => {
    const sender_id = Number(req.body.sender_id); const target_id = Number(req.body.target_id); const isOwner = sender_id === OWNER_ID;
    if (!isOwner && !(await checkAdmin(sender_id))) return res.status(403).json({ error: "Нет доступа" });

    if (req.body.action === 'add') {
        let days = 30; if (isOwner && req.body.days) days = Number(req.body.days); 
        let user = await User.findOne({ tg_id: target_id }); let expDate = user && user.sub_exp > Date.now() ? new Date(user.sub_exp) : new Date(); expDate.setDate(expDate.getDate() + days);
        let cleanSub = (req.body.sub_type || "FREE").trim(); if (/^ultra$/i.test(cleanSub)) cleanSub = "Ultra"; else if (/^vip$/i.test(cleanSub)) cleanSub = "VIP"; else if (/^pro$/i.test(cleanSub)) cleanSub = "Pro"; else if (/^premium$/i.test(cleanSub)) cleanSub = "Premium";
        await User.findOneAndUpdate({ tg_id: target_id }, { subscription: cleanSub, sub_exp: expDate.getTime() }, { upsert: true }); await sendTgMessage(target_id, `Администратор выдал вам подписку ${cleanSub}`); res.json({ message: `Подписка выдана на ${days} дней` });
    } else {
        if (!isOwner) return res.status(403).json({ error: "Только Овнер может забирать подписку" });
        await User.findOneAndUpdate({ tg_id: target_id }, { subscription: "FREE", sub_exp: 0 }, { upsert: true }); await sendTgMessage(target_id, `Администратор забрал вашу подписку`); res.json({ message: "Подписка аннулирована" });
    }
});

app.post('/api/admin/create-char', async (req, res) => { if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет доступа" }); await new Character(req.body.charData).save(); res.json({ message: "Персонаж добавлен!" }); });
app.post('/api/admin/delete-char', async (req, res) => { if (Number(req.body.sender_id) !== OWNER_ID) return res.status(403).json({ error: "Только Овнер может удалять" }); await Character.findOneAndDelete({ id: req.body.char_id }); res.json({ message: "Удален" }); });
app.post('/api/admin/create-promo', async (req, res) => { if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет доступа" }); await new Promo(req.body.promoData).save(); res.json({ message: "Промо создан" }); });
app.post('/api/admin/delete-promo', async (req, res) => { if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет доступа" }); await Promo.findOneAndDelete({ code: req.body.code }); res.json({ message: "Промо удален" }); });
app.post('/api/admin/create-task', async (req, res) => { if (!(await checkAdmin(req.body.sender_id))) return res.status(403).json({ error: "Нет доступа" }); await new Task(req.body.taskData).save(); res.json({ message: "Задание добавлено" }); });
app.post('/api/admin/delete-task', async (req, res) => { if (Number(req.body.sender_id) !== OWNER_ID) return res.status(403).json({ error: "Только Овнер может удалять" }); await Task.findOneAndDelete({ id: req.body.task_id }); res.json({ message: "Задание удалено" }); });

app.post('/api/owner/set-admin', async (req, res) => {
    if (Number(req.body.owner_id) !== OWNER_ID) return res.status(403).json({ error: "Доступно только Овнеру" });
    await User.findOneAndUpdate({ tg_id: Number(req.body.target_id) }, { is_admin: req.body.status }, { upsert: true });
    if (req.body.status) await sendTgMessage(req.body.target_id, `Администратор сделал вас админом`); else await sendTgMessage(req.body.target_id, `Администратор забрал у вас права админа`);
    res.json({ message: "Статус обновлен" });
});

app.post('/api/owner/set-price', async (req, res) => {
    if (Number(req.body.sender_id) !== OWNER_ID) return res.status(403).json({ error: "Доступно только Овнеру" });
    const { item_id, stars, ton } = req.body;
    await Price.findOneAndUpdate({ item_id }, { stars: Number(stars), ton: Number(ton) }, { upsert: true });
    res.json({ message: "Прайс-лист успешно обновлен!" });
});

module.exports = app;
if (!process.env.VERCEL) { const PORT = process.env.PORT || 3000; app.listen(PORT, () => console.log(`Запущен на порту ${PORT}`)); }
