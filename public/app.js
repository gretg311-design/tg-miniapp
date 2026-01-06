const OWNER_ID = 8287041036;

// ЭМУЛЯЦИЯ ПОЛЬЗОВАТЕЛЯ (Telegram подключим позже)
const user = {
  id: 8287041036, // ← сейчас ты
  isAdmin: true
};

function showApp() {
  document.getElementById('loader').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  applyRoles();
}

setTimeout(showApp, 1500);

// НАВИГАЦИЯ
function openScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function back() {
  openScreen('main-menu');
}

// РОЛИ
function applyRoles() {
  if (user.id === OWNER_ID) {
    document.getElementById('console-btn').classList.remove('hidden');
    document.getElementById('admin-btn').classList.remove('hidden');
  } else if (user.isAdmin) {
    document.getElementById('admin-btn').classList.remove('hidden');
  }
}
