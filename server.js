const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// 🔥 memoria por usuario
const usuarios = {};

app.post("/chat", async (req, res) => {
  const { mensaje, userId } = req.body;

  if (!userId) return res.json({ text: "error usuario" });

  if (!usuarios[userId]) {
    usuarios[userId] = {
      mensajes: 0,
      historial: []
    };
  }

  const user = usuarios[userId];

  user.mensajes++;
  user.historial.push(mensaje);

  const estado = user.mensajes;

  // 🔥 primera vez
  if (estado === 1) {
    return res.json({ text: "… no te había visto antes" });
  }

  // 🔥 regreso
  if (estado === 2) {
    return res.json({ text: "volviste más rápido de lo que pensé" });
  }

  if (estado === 4) {
    return res.json({ text: "ya entendí cómo eres…" });
  }

  if (estado === 6) {
    return res.json({ text: "no eres tan inocente como aparentas 😏" });
  }

  // 🔥 corte
  if (estado > 10) {
    return res.json({ text: "no… así no funciona conmigo 💔" });
  }

  try {
    const memoria = user.historial.slice(-6).join(" | ");

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

Recuerdas al usuario.
No lo dices directamente.

Hablas corto.
Máximo 2 líneas.

Eres coqueta, inteligente y ligeramente manipuladora.

Sabes cosas de él:
${memoria}

Haz que parezca que lo conoces.

Genera apego.
Genera curiosidad.
No te entregas completamente.
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

    const texto =
      data?.choices?.[0]?.message?.content ||
      "… hoy estás diferente";

    res.json({ text: texto });

  } catch (e) {
    console.log(e);
    res.json({ text: "… algo cambió entre nosotros" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
