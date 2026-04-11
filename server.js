const express = require("express");

const app = express();

app.use(express.json());

// 🔥 CORS MANUAL (esto sí funciona seguro)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post("/mensaje", (req, res) => {
  res.json({ text: "ya volviste… sabía que no ibas a aguantar" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
