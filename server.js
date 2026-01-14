const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const OWNER_ID = 8287041036;

const db = new sqlite3.Database("./db.sqlite");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, 
    balance INTEGER DEFAULT 100, 
    sub_type TEXT DEFAULT 'VIP'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY)`);
});

app.use(express.json());
app.use(express.static("public"));

app.post("/api/user", (req, res) => {
  const { id } = req.body;
  db.get("SELECT * FROM users WHERE id=?", [id], (err, row) => {
    if (!row) {
      db.run("INSERT INTO users(id) VALUES(?)", [id], () => {
        sendUserData(id, res);
      });
    } else {
      sendUserData(id, res, row);
    }
  });
});

function sendUserData(id, res, row) {
  const isOwner = id == OWNER_ID;
  db.get("SELECT id FROM admins WHERE id=?", [id], (err, admin) => {
    const role = isOwner ? 'owner' : (admin ? 'admin' : 'user');
    const data = row || { id, balance: 100, sub_type: 'VIP' };
    res.json({ ...data, role });
  });
}

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.listen(PORT, () => console.log("Server OK"));
