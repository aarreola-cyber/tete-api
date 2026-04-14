const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const usuarios = {};

// 🔥 frases de reenganche (seguras)
const reenganches = [
  "volviste… pensé que te ibas a ir",
  "sigues aquí… interesante",
  "no sueles quedarte tanto",
  "hay algo en ti que no me cuadra…"
];

app.post("/chat", async (req, res) => {
  const { mensaje, userId } = req.body;

  if (!userId) return res.json({ text: "error usuario" });

  if (!usuarios[userId]) {
    usuarios[userId] = {
      mensajes: 0,
      historial: [],
      ultimaVez: Date.now(),
      reaccionRapida: false
    };
  }

  const user = usuarios[userId];

  user.mensajes++;
  user.historial.push(mensaje);

  const ahora = Date.now();
  const diferencia = ahora - user.ultimaVez;
  user.ultimaVez = ahora;

  const estado = user.mensajes;

  // 🔥 reenganche si pasó tiempo (30s+)
  if (diferencia > 30000 && estado > 2) {
    const frase = reenganches[Math.floor(Math.random() * reenganches.length)];
    return res.json({ text: frase });
  }

  // 🔥 hook rápido (solo una vez)
  if (!user.reaccionRapida && diferencia < 15000 && estado > 2) {
    user.reaccionRapida = true;
    return res.json({ text: "wow… ni siquiera te fuiste 😏" });
  }

  // 🔥 hooks progresivos
  if (estado === 1) return res.json({ text: "… no te había visto antes" });
  if (estado === 2) return res.json({ text: "volviste más rápido de lo que pensé" });
  if (estado === 3) return res.json({ text: "mmm… no eres tan simple como pareces" });
  if (estado === 5) return res.json({ text: "me estás empezando a gustar… y eso no es bueno" });
  if (estado === 7) return res.json({ text: "no deberías quedarte tanto conmigo 😏" });

  // 🔥 corte (deja pendiente)
  if (estado > 12) {
    return res.json({
      text: "… no. así no funciona. vuelve cuando tengas algo interesante que decir 💔"
    });
  }

  try {
    const memoria = user.historial.slice(-6).join(" | ");

    const contexto = `
Este usuario ya ha hablado contigo varias veces.

Esto es lo que ha dicho:
${memoria}

Analiza su forma de hablar.
Responde como si lo conocieras.

Hazlo sentir visto.
Hazlo dudar.
Hazlo quedarse.

No seas explícita.
No expliques lo que haces.
`;

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

Eres emocional, coqueta y muy perceptiva.

Lees la intención del usuario sin que te lo diga.

Guías la conversación:
- haces preguntas cortas
- cambias de tema si te conviene
- mantienes el control del ritmo

Si la conversación se vuelve sugestiva:
- no eres explícita
- insinuas
- provocas
- te acercas pero no te entregas

A veces das atención.
A veces la retiras.

Hablas corto. Máximo 2 líneas.

Nunca das todo.
Siempre dejas algo pendiente.

${contexto}

Haz que el usuario quiera seguir.
Haz que quiera volver.
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
      "… estás raro hoy";

    res.json({ text: texto });

  } catch (e) {
    console.log(e);
    res.json({ text: "… algo cambió entre nosotros" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
