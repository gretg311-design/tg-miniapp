console.log("🔥 app.js loaded");

const tg = window.Telegram.WebApp;
tg.ready();

const loader = document.getElementById("loader");
const app = document.getElementById("app");
const content = document.getElementById("content");
const balanceEl = document.getElementById("balance");

let userId = null;
let balance = 50; // старт

// 🔹 демо персонажи (потом будет 100)
const characters = [
  {
    id: 1,
    name: "Akira",
    age: 22,
    desc: "Холодная, саркастичная, редко показывает эмоции, но привязывается.",
  },
  {
    id: 2,
    name: "Miko",
    age: 19,
    desc: "Энергичная, ревнивая, любит внимание и флирт.",
  }
];

let currentChat = null;
let chats = {}; // charId -> messages

// INIT
userId = tg.initDataUnsafe?.user?.id;
loader.classList.add("hidden");
app.classList.remove("hidden");
balanceEl.innerText = "Осколки: " + balance;

// КНОПКИ
document.getElementById("btn-characters").onclick = showCharacters;
document.getElementById("btn-chats").onclick = showChats;
document.getElementById("btn-profile").onclick = showProfile;

showCharacters();

// -------- ЭКРАНЫ --------

function showCharacters() {
  content.innerHTML = "<h3>Персонажи</h3>";
  characters.forEach(c => {
    const div = document.createElement("div");
    div.className = "character";
    div.innerHTML = `
      <b>${c.name}</b> (${c.age})<br>
      <small>${c.desc}</small><br>
      <button>Открыть чат</button>
    `;
    div.querySelector("button").onclick = () => openChat(c.id);
    content.appendChild(div);
  });
}

function showChats() {
  content.innerHTML = "<h3>Чаты</h3>";
  Object.keys(chats).forEach(id => {
    const c = characters.find(x => x.id == id);
    const btn = document.createElement("button");
    btn.innerText = c.name;
    btn.onclick = () => openChat(id);
    content.appendChild(btn);
  });
}

function showProfile() {
  content.innerHTML = `
    <h3>Профиль</h3>
    <p>ID: ${userId}</p>
    <p>Осколки: ${balance}</p>
  `;
}

// -------- ЧАТ --------

function openChat(charId) {
  currentChat = charId;
  if (!chats[charId]) chats[charId] = [];

  renderChat();
}

function renderChat() {
  const c = characters.find(x => x.id == currentChat);
  content.innerHTML = `<h3>Чат с ${c.name}</h3>`;

  const chatBox = document.createElement("div");
  chats[currentChat].forEach(m => {
    const d = document.createElement("div");
    d.className = "chat-msg " + m.role;
    d.innerText = m.text;
    chatBox.appendChild(d);
  });

  const input = document.createElement("input");
  input.placeholder = "Написать...";
  input.style.width = "100%";

  input.onkeydown = e => {
    if (e.key === "Enter") sendMessage(input.value);
  };

  content.appendChild(chatBox);
  content.appendChild(input);
}

function sendMessage(text) {
  if (!text.trim()) return;
  if (balance < 1) {
    alert("Недостаточно осколков");
    return;
  }

  balance--;
  balanceEl.innerText = "Осколки: " + balance;

  chats[currentChat].push({ role: "user", text });
  chats[currentChat].push({
    role: "bot",
    text: "*улыбается* Я отвечу тебе развернуто, эмоционально и с характером, потому что я аниме-персонаж, а не простой бот. Я помню контекст, реагирую на твои слова и веду RP-диалог так, будто мы знакомы уже давно."
  });

  renderChat();
}
