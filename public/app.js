console.log("🔥 MiniApp loaded");

const text = document.getElementById("text");

function showError(msg) {
  text.innerHTML = `<div class="error">❌ ${msg}</div>`;
}

if (!window.Telegram || !window.Telegram.WebApp) {
  showError("Откройте мини-приложение из Telegram");
} else {
  const tg = window.Telegram.WebApp;

  tg.ready();              // 🔴 ОБЯЗАТЕЛЬНО
  tg.expand();             // 📱 на весь экран
