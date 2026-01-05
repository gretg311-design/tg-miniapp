const status = document.getElementById("status");

if (!window.Telegram || !Telegram.WebApp) {
  status.innerText = "❌ Не Telegram среда";
} else {
  const tg = Telegram.WebApp;
  tg.ready();

  status.innerText =
    "✅ Telegram OK\n" +
    "User ID: " + (tg.initDataUnsafe?.user?.id || "нет");
}
