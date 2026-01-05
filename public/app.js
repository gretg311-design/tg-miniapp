const status = document.getElementById("status");

const tg = Telegram.WebApp;
tg.ready();

const userId = tg.initDataUnsafe?.user?.id;

if (!userId) {
  status.innerText = "❌ Нет Telegram ID";
} else {
  status.innerText = "🔍 Проверяем пользователя...";

  fetch(`/user/${userId}`)
    .then(res => res.json())
    .then(data => {
      if (data.exists) {
        status.innerText = "✅ Пользователь уже есть\nID: " + userId;
      } else {
        status.innerText = "➕ Новый пользователь, сохраняем...";

        fetch("/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegram_id: userId })
        })
          .then(() => {
            status.innerText = "🎉 Пользователь добавлен\nID: " + userId;
          })
          .catch(() => {
            status.innerText = "❌ Ошибка сохранения";
          });
      }
    })
    .catch(() => {
      status.innerText = "❌ Ошибка сервера";
    });
}
