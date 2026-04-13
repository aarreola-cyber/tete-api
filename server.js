const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// memoria simple por usuario
const estado = {};

app.post("/chat", (req, res) => {
  const user = req.ip;
  const { mensaje } = req.body;

  if (!estado[user]) estado[user] = 0;
  estado[user]++;

  let respuesta = "";

  if (estado[user] === 1) {
    respuesta = "mmm... hola, pensé que solo ibas a mirar 👀";
  } else if (estado[user] === 2) {
    respuesta = "te gusta hablar conmigo, verdad?";
  } else if (estado[user] === 3) {
    respuesta = "no me engañas... sé exactamente qué buscas";
  } else if (estado[user] === 4) {
    respuesta = "te estás quedando más de lo normal 😏";
  } else if (estado[user] === 5) {
    respuesta = "esto ya se está poniendo interesante...";
  } else {
    return res.json({
      text: "esto ya no es gratis 💔"
    });
  }

  res.json({ text: respuesta });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
