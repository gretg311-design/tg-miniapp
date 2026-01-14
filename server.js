const express = require('express');
const axios = require('axios');
const app = express();

const MY_WALLET = "UQCm8mTj_LHm0DyCvpNOs8PtwDqfrr_BjDSoJVJnm81WO08d"; // Твой адрес
const OWNER_ID = 8287041036; // Твой ID

let users = {}; 
let tasks = []; 

// Фоновая проверка блокчейна TON
async function checkTonTransactions() {
    try {
        const res = await axios.get(`https://toncenter.com/api/v2/getTransactions?address=${MY_WALLET}&limit=20`);
        const txs = res.data.result;
        txs.forEach(tx => {
            const comment = tx.in_msg.message;
            const amount = tx.in_msg.value / 1000000000;
            if (comment && comment.startsWith('ID')) {
                const uid = comment.replace('ID', '');
                if (users[uid] && !tx.processed) {
                    users[uid].balance += (amount * 1000); // Начисление: 1 TON = 1000 осколков
                    tx.processed = true;
                }
            }
        });
    } catch (e) { /* Блокчейн TON синхронизируется */ }
}
setInterval(checkTonTransactions, 30000);

app.use(express.json());
app.use(express.static('public'));

app.post('/api/register', (req, res) => {
    const { userId, name, gender } = req.body;
    users[userId] = { name, gender, balance: 100, premium: false };
    res.json({ success: true });
});

app.post('/api/tasks', (req, res) => {
    const { action, userId, id, title } = req.body;
    if (action === 'add') { tasks.push({ id: Date.now(), title }); res.json({ success: true }); }
    else if (action === 'delete' && parseInt(userId) === OWNER_ID) {
        tasks = tasks.filter(t => t.id !== id);
        res.json({ success: true });
    } else { res.status(403).send("Ошибка прав"); }
});

app.listen(process.env.PORT || 3000);
