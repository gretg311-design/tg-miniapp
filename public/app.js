const status = document.getElementById("status");

const tg = Telegram.WebApp;
tg.ready();

const userId = tg.initDataUnsafe?.user?.id;

if (!userId) {
  status.innerText = "❌ Нет Telegram ID";
} else {
  status.innerText = "🔍 Проверка доступа...";

  fetch(`/access/${userId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.access) {
        status.innerText = "⛔ Доступ запрещён";
        tg.close();
      } else {
        status.innerText = "✅ Доступ разрешён\nID: " + userId;
      }
    })
    .catch(() => {
      status.innerText = "❌ Ошибка сервера";
    });
}
