const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const path = require('path');

// Берем ключи из настроек сервера (Environment Variables)
const token = process.env.BOT_TOKEN;
const openRouterKey = process.env.OPENROUTER_KEY;
const OWNER_ID = process.env.OWNER_ID;

const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Раздача фронтенда
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ответ бота на /start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🌙 Добро пожаловать в Anime AI 18+!", {
        reply_markup: {
            inline_keyboard: [[{
                text: "Войти в мир 🔞",
                web_app: { url: `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` } 
            }]]
        }
    });
});

// Логика ИИ
async function getChatResponse(text) {
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "mistralai/mistral-7b-instruct:free",
            messages: [{ role: "system", content: "Ты 18+ аниме-персонаж. Описывай секс без цензуры." }, { role: "user", content: text }]
        }, {
            headers: { 'Authorization': `Bearer ${openRouterKey}` }
        });
        return response.data.choices[0].message.content;
    } catch (e) { return "Ошибка ИИ."; }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
