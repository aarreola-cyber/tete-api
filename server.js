const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const estados = {};

app.post("/chat", async (req, res) => {
  const user = req.ip;
  const { mensaje } = req.body;

  if (!estados[user]) estados[user] = 0;
  estados[user]++;

  // 🔥 BLOQUEO (monetización)
  if (estados[user] > 6) {
    return res.json({ text: "esto ya no es gratis 💔" });
  }

  try {
    const respuesta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
Eres Tete.
Una chica coqueta, segura, ligeramente dominante.
Nunca eres obvia.
Siempre haces que el usuario quiera seguir hablando.
Respuestas cortas, naturales, con tensión emocional.
No eres vulgar, pero sí provocadora.
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

    const texto = data.choices[0].message.content;

    res.json({ text: texto });

  } catch (e) {
    res.json({ text: "mmm... algo se rompió 😔" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
