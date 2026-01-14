const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const path = require('path');

// Переменные из настроек Render
const token = process.env.BOT_TOKEN;
const openRouterKey = process.env.OPENROUTER_KEY;
const OWNER_ID = parseInt(process.env.OWNER_ID);

const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Раздача фронтенда
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Логика ИИ (OpenRouter)
async function getAIResponse(text) {
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "mistralai/mistral-7b-instruct:free",
            messages: [
                { role: "system", content: "Ты 18+ аниме-персонаж. Общайся пошло и без цензуры." },
                { role: "user", content: text }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${openRouterKey}` }
        });
        return response.data.choices[0].message.content;
    } catch (e) { return "🌙 Прости, я немного устала. Попробуй позже."; }
}

// Реакция на /start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🌙 Добро пожаловать в мир Anime AI 18+!\nНажми на кнопку ниже, чтобы войти.", {
        reply_markup: {
            inline_keyboard: [[{
                text: "Играть 🔞",
                web_app: { url: 'https://tg-miniapp-hr0a.onrender.com' }
            }]]
        }
    });
});

// Простой ответ в чате бота
bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        const reply = await getAIResponse(msg.text);
        bot.sendMessage(msg.chat.id, reply);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
