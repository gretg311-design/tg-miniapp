const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = "8287041036";
let db = {
    users: {}, 
    chars: [{id: 1, name: "Азуми", age: 19, sex: "Ж", desc: "Кошечка", photo: ""}],
    tasks: [{id: 1, title: "Подписка на канал", reward: 50, link: "https://t.me/yourlink"}],
    admins: []
};

// Авторизация и получение данных юзера
app.post('/api/auth', (req, res) => {
    const { id, name } = req.body;
    const uid = String(id);
    if (!db.users[uid]) {
        db.users[uid] = {
            id: uid, name: name, gender: "М", balance: (uid === OWNER_ID) ? 99999999 : 100,
            sub: "Ultra", streak: 1, role: (uid === OWNER_ID) ? "owner" : (db.admins.includes(uid) ? "admin" : "user")
        };
    }
    res.json({ user: db.users[uid], chars: db.chars, tasks: db.tasks });
});

// Сохранение настроек
app.post('/api/save-settings', (req, res) => {
    const { id, name, gender } = req.body;
    if (db.users[id]) {
        db.users[id].name = name;
        db.users[id].gender = gender;
        res.json({ success: true });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Server Live'));
