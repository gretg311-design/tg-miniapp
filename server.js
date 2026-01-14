const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const axios = require('axios');

const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});
const OWNER_ID = parseInt(process.env.OWNER_ID); // Твой ID
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

const app = express();
app.use(express.json());
app.use(express.static('public'));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'anychars_ai', allowed_formats: ['jpg', 'png', 'jpeg'] }
});
const upload = multer({ storage: storage });

let characters = []; 
let users = {}; // userId: { balance: 100, lastDaily: null }

// --- AI Chat Logic ---
async function chatWithAI(text, userId, charId) {
    // Получаем персонажа по ID
    const char = characters.find(c => c.id === charId) || characters[0]; 
    if (!char) return "Нет доступных персонажей.";

    // Проверка баланса и списание
    if (!users[userId] || users[userId].balance < 2) {
        return "🌙 Недостаточно осколков для чата. Пополни баланс!";
    }
    users[userId].balance -= 2; // Списываем 2 осколка за сообщение

    try {
