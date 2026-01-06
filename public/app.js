const tg = Telegram.WebApp;
tg.ready();

fetch("/api/init", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ initData: tg.initData })
})
.then(r => r.json())
.then(data => {
  window.USER = data.user;
  document.getElementById("loader").hidden = true;
  document.getElementById("app").hidden = false;
});

function showProfile() {
  alert(`ID: ${USER.id}\nБаланс: ${USER.balance}\nРоль: ${USER.role}`);
}

function showTasks() {
  if (confirm("Подписался на канал?")) {
    fetch("/api/task/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER.id })
    })
    .then(r => r.json())
    .then(d => {
      if (d.ok) alert("🌙 +" + d.reward);
      else alert("Уже выполнено");
    });
  }
}
