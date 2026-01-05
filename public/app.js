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
  if (!data.ok) {
    document.body.innerHTML = "❌ Ошибка проверки Telegram";
    return;
  }

  document.body.innerHTML = `
    <h3>✅ Доступ разрешён</h3>
    <p>ID: ${data.user.id}</p>
    <p>Username: ${data.user.username}</p>
    <p>Premium: ${data.user.premium ? "YES" : "NO"}</p>
  `;
});
