const express = require('express');
const axios = require('axios');
const app = express();

const OWNER_ID = 8287041036;
const MY_WALLET = "UQCm8mTj_LHm0DyCvpNOs8PtwDqfrr_BjDSoJVJnm81WO08d";

app.use(express.json());
app.use(express.static('public'));

let users = {}; 
let tasks = []; 
let chars = [];
let admins = []; 
let logs = [`Система активна: ${new Date().toLocaleTimeString()}`];
let promoCodes = { "START": 100 };

// ПРОВЕРКА TON
async function scanTON() {
    try {
        const res = await axios.get(`https://toncenter.com/api/v2/getTransactions?address=${MY_WALLET}&limit=5`);
        res.data.result.forEach(tx => {
            const msg = tx.in_msg.message;
            if (msg && msg.startsWith('ID')) {
                const uid = msg.replace('ID', '');
                if (users[uid] && !tx.handled) {
                    users[uid].balance += (tx.in_msg.value / 1e9 * 1000);
                    logs.push(`💰 Оплата: ID${uid} +${tx.in_msg.value / 1e9} TON`);
                    tx.handled = true;
                }
            }
        });
    } catch (e) {}
}
setInterval(scanTON, 20000);

// API ИНИЦИАЛИЗАЦИИ
app.get('/api/data/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const role = (id === OWNER_ID) ? 'owner' : (admins.includes(id) ? 'admin' : 'user');
    res.json({ user: users[id] || null, tasks, chars, logs: (role !== 'user' ? logs : []), role });
});

// РЕГИСТРАЦИЯ
app.post('/api/reg', (req, res) => {
    const { id, name, gender } = req.body;
    users[id] = { name, gender, balance: 100, premium: "Нет", premExpire: null };
    logs.push(`👤 Регистрация: ${name} (ID: ${id})`);
    res.json({ success: true });
});

// МОЩНАЯ АДМИНКА
app.post('/api/admin/action', (req, res) => {
    const { userId, action, data } = req.body;
    const uid = parseInt(userId);
    const isOwner = uid === OWNER_ID;
    const isAdmin = admins.includes(uid);

    if (!isOwner && !isAdmin) return res.status(403).send("No access");

    // Функции для обоих (Админ и Овнер)
    if (action === 'add_task') tasks.push({ id: Date.now(), ...data });
    if (action === 'add_char') chars.push({ id: Date.now(), ...data });

    // ТОЛЬКО ОВНЕР
    if (isOwner) {
        if (action === 'del_task') tasks = tasks.filter(t => t.id !== data.id);
        if (action === 'del_char') chars = chars.filter(c => c.id !== data.id);
        if (action === 'set_admin') admins.push(parseInt(data.newId));
        
        // УПРАВЛЕНИЕ ОСКОЛКАМИ
        if (action === 'edit_balance') {
            const target = users[data.targetId];
            if (target) {
                target.balance = (data.mode === 'add') ? target.balance + parseInt(data.amount) : target.balance - parseInt(data.amount);
                logs.push(`💎 Овнер ${data.mode === 'add' ? 'выдал' : 'забрал'} ${data.amount} осколков у ID${data.targetId}`);
            }
        }

        // ВЫДАЧА ПОДПИСКИ
        if (action === 'set_prem') {
            const target = users[data.targetId];
            if (target) {
                target.premium = data.type;
                target.premExpire = data.days;
                logs.push(`👑 Овнер выдал подписку [${data.type}] юзеру ID${data.targetId} на ${data.days} дн.`);
            }
        }
    } else if (isAdmin && (action.startsWith('del') || action === 'set_prem' || action === 'edit_balance')) {
        return res.status(403).send("Только для Овнера");
    }

    res.json({ success: true });
});

app.listen(process.env.PORT || 3000);
