const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- НАСТРОЙКИ ИЗ RENDER ---
const { OWNER_ID, BOT_TOKEN, CRYPTO_PAY_TOKEN, OPENROUTER_KEY, BOT_USERNAME } = process.env;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// РАЗДАЧА ИНТЕРФЕЙСА (ТВОЯ ПАПКА public)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ХРАНИЛИЩЕ (Временное, для тестов. Для продакшена нужна БД типа MongoDB)
let users = {}; 
let characters = []; 

// --- ПЛАТЕЖИ: CRYPTO BOT ---
app.post('/api/pay/crypto', async (req, res) => {
    const { userId, amountUsd, moonAmount } = req.body;
    try {
        const response = await fetch("https://pay.cryptobot.pay/api/createInvoice", {
            method: 'POST',
            headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                asset: "TON", amount: amountUsd,
                description: `Пополнение ${moonAmount} 🌙`,
                payload: `user_${userId}_${moonAmount}`,
                paid_btn_name: "openBot", paid_btn_url: `https://t.me/${BOT_USERNAME}`
            })
        });
        const data = await response.json();
        res.json({ payUrl: data.result.pay_url });
    } catch (e) { res.status(500).json({ error: "Ошибка платежной системы" }); }
});

// --- ПЛАТЕЖИ: ЗВЕЗДЫ ---
app.post('/api/pay/stars', async (req, res) => {
    const { userId, starsAmount, moonAmount } = req.body;
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: `Купить ${moonAmount} 🌙`,
                description: `Пополнение баланса осколков`,
                payload: `stars_${userId}_${moonAmount}`,
                currency: "XTR",
                prices: [{ label: "Оплата", amount: starsAmount }]
            })
        });
        const data = await response.json();
        res.json({ link: data.result });
    } catch (e) { res.status(500).json({ error: "Ошибка звезд" }); }
});

// --- ЧАТ: ЖИВОЙ ПЕРСОНАЖ 18+ (БЕЗ ЭМОДЗИ) ---
app.post('/api/chat', async (req, res) => {
    const { userId, charId, message, settings } = req.body;
    const user = users[userId] || { name: "Юзер", gender: "male", balance: 10 };
    const char = characters.find(c => c.id == charId);

    if (user.balance < 1) return res.status(403).json({ error: "Нет осколков" });
    user.balance -= 1;

    const systemPrompt = `Ты — ${char.name}, тебе ${char.age}. Характер: ${char.personality}. История: ${char.story}.
    ПРАВИЛА: Ты ЖИВОЙ человек. ЭМОДЗИ ЗАПРЕЩЕНЫ. Описывай действия максимально пошло и детально в *звездочках* (18+). 
    Юзер: ${user.name}, пол: ${user.gender}. Умная память: запоминай ключевые моменты.
    Длина ответа: от 45 до ${settings.wordLimit || 80} слов.`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "openai/gpt-4-turbo",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }]
        })
    });
    const data = await aiRes.json();
    res.json({ text: data.choices[0].message.content, balance: user.balance });
});

// --- АДМИНКА (ВЫГРУЗКА ФОТО ИЗ ПАМЯТИ) ---
app.post('/api/admin/add-char', upload.single('photo'), async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.file.path);
        const newChar = { ...req.body, id: Date.now(), photoUrl: result.secure_url };
        characters.push(newChar);
        res.json(newChar);
    } catch (e) { res.status(500).json({ error: "Ошибка загрузки фото" }); }
});

app.post('/api/admin/delete-char', (req, res) => {
    if (req.body.userId != OWNER_ID) return res.status(403).send("No Access");
    characters = characters.filter(c => c.id != req.body.charId);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
