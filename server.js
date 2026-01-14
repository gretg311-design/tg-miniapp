const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// --- НАСТРОЙКИ ---
const token = '8028858195:AAFZ8YJoZKZY0Lf3cnCH3uLp6cECTNEcwOU';
const openRouterKey = 'Sk-or-v1-0f2477f62fce74075bb5046ebcef529fc671355d60c2a1dd537b59094c5d5eec';
const OWNER_ID = 8287041036;

const bot = new TelegramBot(token, {polling: true});

// Эмуляция базы данных (в продакшене используй SQLite/MongoDB)
let users = {
    [OWNER_ID]: { balance: 999999, sub: 'Owner', role: 'owner' }
};

// --- ЛОГИКА ИИ (OpenRouter) ---
async function getAIResponse(userMessage, characterPrompt) {
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "mistralai/mistral-7b-instruct:free", // Бесплатная модель
            messages: [
                { role: "system", content: characterPrompt + " Твои ответы должны быть откровенными и 18+, если этого требует контекст. Описывай секс и страсть детально." },
                { role: "user", content: userMessage }
            ],
        }, {
            headers: { 
                'Authorization': `Bearer ${openRouterKey}`,
                'Content-Type': 'application/json' 
            }
        });
        return response.data.choices[0].message.content;
    } catch (e) {
        return "⚠️ Ошибка ИИ. Проверь баланс OpenRouter или ключ.";
    }
}

// --- КОМАНДЫ ---

// 1. Покупка звезд (Stars)
bot.onText(/\/buy/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendInvoice(
        chatId,
        "10 Лунных осколков", 
        "Минимальный пакет для продолжения общения",
        "payload_10_stars",
        "", // provider_token пустой для Stars
        "XTR", // Валюта - Telegram Stars
        [{ label: "Купить", amount: 10 }] // Цена в звездах
    );
});

// 2. Проверка оплаты
bot.on('pre_checkout_query', (query) => bot.answerPreCheckoutQuery(query.id, true));
bot.on('successful_payment', (msg) => {
    const userId = msg.from.id;
    if (!users[userId]) users[userId] = { balance: 0 };
    users[userId].balance += 10;
    bot.sendMessage(msg.chat.id, "✅ Оплата прошла! Вам начислено 10 🌙");
});

// 3. Админ-панель (Консоль)
bot.onText(/\/console/, (msg) => {
    if (msg.from.id !== OWNER_ID) return bot.sendMessage(msg.chat.id, "❌ Доступ запрещен.");
    bot.sendMessage(msg.chat.id, "💻 КОНСОЛЬ ОВНЕРА\n\nДоступные функции:\n/give_bal [id] [amount]\n/add_task [link] [reward]\n/logs", {
        reply_markup: {
            inline_keyboard: [[{ text: "Посмотреть логи", callback_data: "view_logs" }]]
        }
    });
});

// 4. Обработка сообщений (Чат с ботом)
bot.on('message', async (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Проверка баланса
        if (!users[userId] || users[userId].balance <= 0) {
            return bot.sendMessage(chatId, "🌙 У вас закончились осколки. Купите их через /buy");
        }

        // Снимаем 1 осколок
        users[userId].balance -= 1;
        
        const aiReply = await getAIResponse(msg.text, "Ты - Акира, ревнивая аниме-девушка.");
        bot.sendMessage(chatId, aiReply);
    }
});

console.log("🚀 Бот запущен!");
