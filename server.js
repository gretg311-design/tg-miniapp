const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OWNER_ID = 8287041036;

// Имитация БД (в реале используй MongoDB/PostgreSQL)
let users = {};

const SUBS_DATA = {
    'Free': { daily: 15, photo_cost: 5, words: "стандарт", horny: "стандарт" },
    'Premium': { daily: 50, photo_cost: 2, words: "стандарт", horny: "стандарт" },
    'Pro': { daily: 100, photo_cost: 2, words: "стандарт", horny: "стандарт" },
    'VIP': { daily: 250, photo_cost: 2, words: "45-80", horny: "мощная" },
    'Ultra': { daily: 500, photo_cost: 2, words: "45-100", horny: "максимальная" }
};

// Регистрация и Рефералка
app.post('/api/init', (req, res) => {
    const { id, name, gender, ref } = req.body;
    
    if (!users[id]) {
        users[id] = {
            id, name, gender,
            balance: 0,
            sub: 'Ultra', // Пробник 7 дней
            sub_end: Date.now() + (7 * 24 * 60 * 60 * 1000),
            role: (id == OWNER_ID) ? 'owner' : 'user',
            daily_streak: 0,
            last_daily: 0
        };

        if (ref && users[ref] && ref != id) {
            users[id].balance += 100;
            users[ref].balance += 100;
            users[id].sub = 'Premium'; // Бонус за реф
            users[id].sub_end = Date.now() + (7 * 24 * 60 * 60 * 1000);
            users[ref].sub_end += (7 * 24 * 60 * 60 * 1000);
        }
    }
    res.json(users[id]);
});

// Списание за сообщение
app.post('/api/chat', (req, res) => {
    const { id } = req.body;
    if (users[id].balance < 1) return res.status(403).json({error: "Недостаточно 🌙"});
    users[id].balance -= 1;
    res.json({balance: users[id].balance});
});

// Списание за фото
app.post('/api/generate-photo', (req, res) => {
    const { id } = req.body;
    const user = users[id];
    const cost = SUBS_DATA[user.sub].photo_cost;
    
    if (user.balance < cost) return res.status(403).json({error: "Недостаточно 🌙"});
    user.balance -= cost;
    res.json({balance: user.balance});
});

app.listen(3000, () => console.log('Backend запущен на порту 3000'));
