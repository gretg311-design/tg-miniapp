const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({limit: '10mb'})); // Для передачи фото
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = "8287041036";
let db = {
    users: {}, 
    admins: [], 
    // Начальный персонаж, которого видят все
    chars: [{id: Date.now(), name: "Азуми", age: 19, desc: "Твой первый гид в этом мире.", photo: null}]
};

app.post('/api/auth', (req, res) => {
    const { id, name } = req.body;
    const uid = String(id);
    if (!db.users[uid]) {
        db.users[uid] = {
            id: uid, name: name, gender: "М", balance: (uid === OWNER_ID) ? 99999999 : 15,
            sub: "Free", streak: 1, role: (uid === OWNER_ID) ? "owner" : (db.admins.includes(uid) ? "admin" : "user")
        };
    }
    res.json({ user: db.users[uid], chars: db.chars });
});

// Добавление персонажа овнером или админом
app.post('/api/create-char', (req, res) => {
    const { char } = req.body;
    db.chars.push({ ...char, id: Date.now() });
    res.json({ success: true, chars: db.chars });
});

// Удаление персонажа (Только Owner)
app.post('/api/delete-char', (req, res) => {
    const { id, userId } = req.body;
    if (String(userId) === OWNER_ID) {
        db.chars = db.chars.filter(c => c.id !== id);
        res.json({ success: true, chars: db.chars });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
