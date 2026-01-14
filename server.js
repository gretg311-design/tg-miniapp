const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});
const OWNER_ID = parseInt(process.env.OWNER_ID);

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Настройка Облака
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'anime_app', allowed_formats: ['jpg', 'png'] }
});
const upload = multer({ storage: storage });

// Базы данных в памяти
let characters = [];
let tasks = [];

// API для персонажей
app.post('/api/chars', upload.single('photo'), (req, res) => {
    const { name, bio, userId } = req.body;
    const newChar = { id: Date.now(), name, bio, photo: req.file.path };
    characters.push(newChar);
    res.json({ success: true });
});

app.get('/api/chars', (req, res) => res.json(characters));

// API для заданий
app.post('/api/tasks', (req, res) => {
    const { action, title, link, reward, userId } = req.body;
    if (action === 'add') {
        tasks.push({ id: Date.now(), title, link, reward });
        res.json({ success: true });
    } else if (action === 'delete' && parseInt(userId) === OWNER_ID) {
        tasks = tasks.filter(t => t.id !== req.body.id);
        res.json({ success: true });
    }
});

app.get('/api/tasks', (req, res) => res.json(tasks));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Система запущена!'));
