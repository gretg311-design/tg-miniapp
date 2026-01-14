const express = require('express');
const axios = require('axios');
const app = express();

const OWNER_ID = 8287041036;
const MY_WALLET = "UQCm8mTj_LHm0DyCvpNOs8PtwDqfrr_BjDSoJVJnm81WO08d";

app.use(express.json());
app.use(express.static('public'));

let users = {}; 
let tasks = [{ id: 1, title: "Подписка на канал", link: "https://t.me/..." }];
let chars = [{ id: 1, name: "Мика", bio: "Твоя верная помощница", photo: "" }];
let admins = []; // Список ID админов

// МОНИТОРИНГ БЛОКЧЕЙНА TON
async function checkTon() {
    try {
        const res = await axios.get(`https://toncenter.com/api/v2/getTransactions?address=${MY_WALLET}&limit=10`);
        res.data.result.forEach(tx => {
            const comment = tx.in_msg.message;
            if (comment && comment.startsWith('ID')) {
                const uid = comment.replace('ID', '');
                if (users[uid] && !tx.processed) {
                    users[uid].balance += (tx.in_msg.value / 1e9 * 1000);
                    tx.processed = true;
                }
            }
        });
    } catch (e) {}
}
setInterval(checkTon, 30000);

// ИНИЦИАЛИЗАЦИЯ
app.get('/api/init/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (!users[id]) users[id] = { name: "Игрок", balance: 100, gender: "М" };
    const role = (id === OWNER_ID) ? 'owner' : (admins.includes(id) ? 'admin' : 'user');
    res.json({ user: users[id], tasks, chars, role });
});

// УПРАВЛЕНИЕ (Овнер vs Админ)
app.post('/api/admin/action', (req, res) => {
    const { userId, action, data } = req.body;
    const uid = parseInt(userId);
    const isOwner = uid === OWNER_ID;
    const isAdmin = admins.includes(uid);

    if (action === 'add_task' && (isOwner || isAdmin)) {
        tasks.push({ id: Date.now(), title: data.title, link: data.link });
        return res.json({ success: true });
    }
    if (action === 'del_task' && isOwner) { // ТОЛЬКО ОВНЕР
        tasks = tasks.filter(t => t.id !== data.id);
        return res.json({ success: true });
    }
    if (action === 'set_admin' && isOwner) { // ТОЛЬКО ОВНЕР
        admins.push(parseInt(data.newId));
        return res.json({ success: true });
    }
    res.status(403).json({ error: "Нет прав" });
});

app.listen(process.env.PORT || 3000);
