import express from 'express';
import crypto from 'crypto';
import { query } from './db/index.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

/* ---------- Telegram check ---------- */
function checkTelegramAuth(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto
    .createHash('sha256')
    .update(BOT_TOKEN)
    .digest();

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return hmac === hash;
}

/* ---------- API ---------- */
app.post('/api/auth', async (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({ error: 'NO_INIT_DATA' });
  }

  if (!checkTelegramAuth(initData)) {
    return res.status(403).json({ error: 'INVALID_TELEGRAM_DATA' });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));

  await query(
    `INSERT INTO users (telegram_id, username)
     VALUES ($1, $2)
     ON CONFLICT (telegram_id) DO NOTHING`,
    [user.id, user.username]
  );

  res.json({ ok: true });
});

/* ---------- Start ---------- */
app.listen(PORT, () => {
  console.log('Server started on port', PORT);
});
