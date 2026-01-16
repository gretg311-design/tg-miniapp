const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Подключение к БД (Берем из переменных Railway)
const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL)
  .then(() => console.log('🌙 База Осколков Луны подключена'))
  .catch(err => console.error('Ошибка базы:', err));

// Модель игрока
const UserSchema = new mongoose.Schema({
  tgId: { type: Number, unique: true },
  balance: { type: Number, default: 100 },
  subscription: { type: String, default: 'None' }, // Premium, Pro, VIP, Ultra
  subExpiry: Date,
  lastDaily: { type: Date, default: new Date(0) },
  streak: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);

// --- МАГАЗИН И БОНУСЫ ---
const SUB_DATA = {
  'Premium': { price: 500, daily: 50, desc: 'Начальный статус. Увеличивает ежедневный доход Осколков.' },
  'Pro': { price: 1500, daily: 100, desc: 'Для активных игроков. Больше ресурсов для генерации фото.' },
  'VIP': { price: 5000, daily: 250, desc: 'Элитный статус. Доступ к скрытым фразам персонажей.' },
  'Ultra': { price: 10000, daily: 500, desc: 'Максимальная мощь. Приоритетная генерация и x2 к стрикам.' }
};

// Получение данных профиля
app.get('/api/user/:id', async (req, res) => {
  let user = await User.findOne({ tgId: req.params.id });
  if (!user) user = await User.create({ tgId: req.params.id });
  res.json(user);
});

// Ежедневная награда (Защита от накрутки)
app.post('/api/daily', async (req, res) => {
  const user = await User.findOne({ tgId: req.body.tgId });
  const now = new Date();
  const diffHours = (now - user.lastDaily) / (1000 * 60 * 60);

  if (diffHours < 24) {
    return res.json({ success: false, message: `Вернись через ${Math.ceil(24 - diffHours)}ч.` });
  }

  // Проверка стрика (сброс если пропустил более 48 часов)
  if (diffHours > 48) user.streak = 0;
  user.streak += 1;

  let reward = SUB_DATA[user.subscription]?.daily || 10; // 10 если нет подписки
  if (user.streak >= 7) reward *= 2; // Бонус x2 за неделю

  user.balance += reward;
  user.lastDaily = now;
  await user.save();

  res.json({ success: true, reward, streak: user.streak, balance: user.balance });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
