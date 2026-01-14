const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db = { users: {}, characters: [], tasks: [], promos: [] };
const OWNER_ID = 8287041036;

// Инициализация юзера
app.post('/api/auth', (req, res) => {
    const { userId, name, gender } = req.body;
    if (!db.users[userId]) {
        db.users[userId] = {
            id: userId, name, gender,
            balance: (userId == OWNER_ID) ? 99999999 : 100,
            sub: (userId == OWNER_ID) ? 'Ultra' : 'Ultra', // 7 дней тест
            subType: (userId == OWNER_ID) ? 'Infinity' : '7days',
            role: (userId == OWNER_ID) ? 'owner' : 'user',
            streak: 0, lastCheckIn: null
        };
    }
    res.json(db.users[userId]);
});

// Админ-панель: действия строго по ID
app.post('/api/admin/action', (req, res) => {
    const { adminId, targetId, type, value, duration } = req.body;
    const admin = db.users[adminId];
    if (!admin || (admin.role !== 'owner' && admin.role !== 'admin')) return res.status(403).send();

    if (type === 'set_balance') {
        if (admin.role === 'admin' && value < 0) return res.status(403).send("Админ не может отбирать");
        db.users[targetId].balance += parseInt(value);
    }
    if (type === 'set_sub' && admin.role === 'owner') {
        db.users[targetId].sub = value; // На любой срок
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
