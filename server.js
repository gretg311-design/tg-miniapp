const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Настройки из Render Environment
const { OWNER_ID, BOT_TOKEN, CRYPTO_PAY_TOKEN, OPENROUTER_KEY, BOT_USERNAME, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

// Раздача файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// База данных в памяти (сбросится при перезагрузке)
let characters = []; 

// Маршрут для получения списка персонажей (чтобы Луна исчезла)
app.get('/api/characters', (req, res) => {
    res.json(characters);
});

app.post('/api/admin/add-char', upload.single('photo'), async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.file.path);
        const newChar = { 
            id: Date.now(),
            name: req.body.name,
            age: req.body.age,
            personality: req.body.personality,
            story: req.body.story,
            photoUrl: result.secure_url 
        };
        characters.push(newChar);
        res.json(newChar);
    } catch (e) {
        res.status(500).json({ error: "Cloudinary error" });
    }
});

// Главная страница
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
