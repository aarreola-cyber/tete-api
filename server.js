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

  if (estado[user] > 8) {
    return res.json({ text: "esto ya no es gratis 💔" });
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
            content: "Eres Tete. Coqueta, directa, provocadora sutil. Respuestas cortas."
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

    const texto = data?.choices?.[0]?.message?.content || "no dijiste nada interesante";

    res.json({ text: texto });

  } catch (e) {
    console.log("ERROR:", e);
    res.json({ text: "algo salió mal 😔" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
