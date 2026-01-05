console.log("🔥 app.js loaded");

const status = document.getElementById("status");

if (!status) {
  alert("❌ status element not found");
}

if (!window.Telegram || !Telegram.WebApp) {
  status.innerText = "❌ Не Telegram среда";
} else {
  const tg = Telegram.WebApp;
  tg.ready();

  status.innerText =
    "✅ Telegram OK\n" +
    "User ID: " + (tg.initDataUnsafe?.user?.id || "нет");
}
