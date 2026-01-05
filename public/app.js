const status = document.getElementById("status");

if (!window.Telegram || !Telegram.WebApp) {
  status.innerText = "❌ Не Telegram среда";
} else {
  const tg = Telegram.WebApp;
  tg.ready();

  const userId = tg.initDataUnsafe?.user?.id;

  status.innerText = "⏳ Сохраняем пользователя...";

  fetch("/user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegram_id: userId }),
  })
    .then(res => res.json())
    .then(() => {
      status.innerText = "✅ Пользователь сохранён\nID: " + userId;
    })
    .catch(() => {
      status.innerText = "❌ Ошибка сервера";
    });
}
