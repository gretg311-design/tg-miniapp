console.log("🚀 MiniApp script started");

const status = document.getElementById("status");

// Фейл-сейф: если Telegram не ответил за 3 сек
const FAIL_TIMEOUT = 3000;

function showError(msg) {
  status.innerHTML = `<div class="error">❌ ${msg}</div>`;
}

// Проверка среды
if (!window.Telegram || !window.Telegram.WebApp) {
  showError("Открой приложение через Telegram");
  throw new Error("Not in Telegram");
}

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let resolved = false;

// Таймер — чтобы не висело ВЕЧНО
const timer = setTimeout(() => {
  if (!resolved) {
    showError("Telegram не передал данные пользователя");
    console.error("❌ initData timeout");
  }
}, FAIL_TIMEOUT);

// Пытаемся получить пользователя
setTimeout(() => {
  const user = tg.initDataUnsafe && tg.initDataUnsafe.user;

  if (!user || !user.id) {
    showError("Данные пользователя недоступны");
    console.error("❌ user missing", tg.initDataUnsafe);
    return;
  }

  // ✅ ВСЁ ОК
  resolved = true;
  clearTimeout(timer);

  console.log("✅ Telegram user:", user.id);

  status.innerHTML = `
    <h2>🌙 Anime AI</h2>
    <p>Доступ разрешён</p>
    <p style="color:#7c7cff">ID: ${user.id}</p>
  `;

  // 🔜 дальше тут будет интерфейс
}, 100);
