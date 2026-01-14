const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db = { users: {} };
const OWNER_ID = "8287041036";

app.post('/api/auth', (req, res) => {
    const { userId, name, gender } = req.body;
    const idStr = String(userId);

    if (!db.users[idStr]) {
        db.users[idStr] = {
            id: idStr,
            name: name,
            gender: gender,
            balance: (idStr === OWNER_ID) ? 99999999 : 100,
            sub: "Ultra",
            subType: (idStr === OWNER_ID) ? "Infinity" : "30days",
            role: (idStr === OWNER_ID) ? "owner" : "user",
            streak: 1
        };
    }
    res.json(db.users[idStr]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on ${PORT}`));
