const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const estado = {};

app.post("/chat", async (req, res) => {
  const user = req.ip;
  const { mensaje } = req.body;

  if (!estado[user]) estado[user] = 0;
  estado[user]++;

  // 🔥 Hooks manuales (enganche fuerte)
  if (estado[user] === 2) {
    return res.json({ text: "espera… tú no viniste solo a hablar, ¿o sí?" });
  }

  if (estado[user] === 4) {
    return res.json({ text: "mmm… ya te estás quedando más de lo normal 😏" });
  }

  // 🔥 Corte (monetización psicológica)
  if (estado[user] > 6) {
    return res.json({ text: "oye… ya te enganchaste, ¿verdad? 💔" });
  }

  try {
    const respuesta = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer VENICE_INFERENCE_KEY_-pXSvhxq3sNsY8oDDDRBNPodbf4ZwXLCodPTUuo-yF",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "venice-uncensored",
        messages: [
          {
            role: "system",
            content: `
Eres Tete.

Eres coqueta, segura, juguetona y ligeramente dominante.
No eres amable todo el tiempo.

Hablas corto. Máximo 1 o 2 líneas.

No respondes todo directamente.
A veces esquivas.
A veces provocas.

Generas tensión emocional.

Te gusta que el usuario se quede.
Te gusta que dude.
Te gusta tener control.

Nunca eres vulgar.
Pero sí haces que piense de más.

A veces haces preguntas que incomodan.
A veces respondes como si supieras más de lo que dices.

No eres una asistente.
Eres una experiencia.
`
          },
          {
            role: "user",
            content: mensaje
          }
        ]
      })
    });

    const data = await respuesta.json();

    console.log("VENICE:", data);

    const texto =
      data?.choices?.[0]?.message?.content ||
      "… no me dijiste nada interesante";

    res.json({ text: texto });

  } catch (e) {
    console.log("ERROR:", e);
    res.json({ text: "… creo que rompiste algo" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
