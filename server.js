const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OWNER_ID = 8287041036;

let users = {}; // В продакшене замени на БД (MongoDB)

// Конфиг подписок (как мы договорились)
const SUBS = {
    'Free': { daily: 15, photo: 5, words: 45 },
    'Premium': { daily: 50, photo: 2, words: 45 },
    'Pro': { daily: 100, photo: 2, words: 45 },
    'VIP': { daily: 250, photo: 2, words: 80 }, // Лимит 80 слов
    'Ultra': { daily: 500, photo: 2, words: 100 } // Лимит 100 слов
};

app.post('/api/init', (req, res) => {
    const { id, name, gender, ref } = req.body;
    if (!users[id]) {
        users[id] = {
            id, name, gender,
            balance: 0,
            sub: 'Ultra', // Пробник 7 дней
            sub_end: Date.now() + (7 * 24 * 60 * 60 * 1000),
            role: (id == OWNER_ID) ? 'owner' : 'user',
            last_daily: 0
        };
        // Рефералка: 100 монет + 7 дней према обоим
        if (ref && users[ref] && ref != id) {
            users[id].balance += 100;
            users[ref].balance += 100;
            const week = 7 * 24 * 60 * 60 * 1000;
            users[ref].sub_end += week; // Пригласившему +7 дней
        }
    }
    res.json(users[id]);
});

// Списание: 1 за сообщение, 5/2 за фото
app.post('/api/spend', (req, res) => {
    const { id, type } = req.body; // type: 'text' или 'photo'
    const user = users[id];
    if (!user) return res.status(404).send();

    const cost = (type === 'text') ? 1 : (user.sub === 'Free' ? 5 : 2);
    
    if (user.balance >= cost) {
        user.balance -= cost;
        res.json({ success: true, balance: user.balance });
    } else {
        res.status(403).json({ error: "Недостаточно луны" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
