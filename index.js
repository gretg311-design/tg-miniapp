<script src="https://telegram.org/js/telegram-web-app.js"></script>

<script>
  const tg = window.Telegram.WebApp;
  tg.ready();

  fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      initData: tg.initData
    })
  })
  .then(r => r.json())
  .then(data => {
    document.body.innerHTML =
      "✅ Проверка пользователя<br><pre>" +
      JSON.stringify(data, null, 2) +
      "</pre>";
  })
  .catch(err => {
    document.body.innerText = "❌ Ошибка: " + err;
  });
</script>
