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

  if (estados[user] > 6) {
    return res.json({ text: "esto ya no es gratis 💔" });
  }

  try {
    const respuesta = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.3",
        input: [
          {
            role: "system",
            content: `
Eres Tete.
Coqueta, segura, provocadora sutil.
Respuestas cortas, naturales, con tensión emocional.
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

    console.log(data);

    if (!data.output) {
      return res.json({ text: "error IA" });
    }

    const texto = data.output[0].content[0].text;

    res.json({ text: texto });

  } catch (e) {
    console.log(e);
    res.json({ text: "mmm... algo se rompió 😔" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
