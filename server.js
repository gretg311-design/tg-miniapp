require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 ВАЖНО: static ПЕРЕД маршрутами
app.use(express.static(path.join(__dirname, "public")));

// 🔥 ГЛАВНЫЙ РОУТ
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("✅ Server started on port", PORT);
});
