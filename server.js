const express = require("express");
const cors = require("cors");

const app = express();

// 🔥 CORS abierto (importante)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

app.use(express.json());

// 🔥 memoria simple (por IP)
const estado = {};

app.post("/mensaje", (req, res) => {
  const user = req.ip;

  if (!estado[user]) estado[user] = 0;

  estado[user]++;

  // 🔥 progresión real
  if (estado[user] === 1) {
    return res.json({ text: "ya volviste… sabía que no ibas a aguantar" });
  }

  if (estado[user] === 2) {
    return res.json({ text: "no deberías estar aquí tanto tiempo..." });
  }

  if (estado[user] === 3) {
    return res.json({ text: "te estás empezando a enganchar 😏" });
  }

  if (estado[user] === 4) {
    return res.json({ text: "yo ya sé qué tipo eres..." });
  }

  // 🔥 monetización / bloqueo
  return res.json({ text: "esto ya no es gratis 💔" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
