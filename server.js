require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(cors());
app.use(express.json());

// 👉 ВАЖНО: подключаем public
app.use(express.static(path.join(__dirname, "public")));

// 👉 ГЛАВНЫЙ РОУТ
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// тест сервера
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log("🚀 Server started on port", PORT);
});
