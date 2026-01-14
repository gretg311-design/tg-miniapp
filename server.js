const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OWNER_ID = "8287041036";
let db = {
    users: {}, 
    admins: [], 
    characters: [], 
    tasks: [], 
    promos: []
};

app.post('/api/auth', (req, res) => {
    const { userId, name } = req.body;
    const id = String(userId);
    if (!db.users[id]) {
        db.users[id] = {
            id: id,
            name: name,
            gender: "М",
            balance: (id === OWNER_ID) ? 99999999 : 100,
            sub: "Ultra", // Тестовая подписка
            subDays: 30,
            streak: 1,
            role: (id === OWNER_ID) ? "owner" : (db.admins.includes(id) ? "admin" : "user")
        };
    }
    res.json(db.users[id]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on ${PORT}`));
