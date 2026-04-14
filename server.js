const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const DB_FILE = "./db.json";

// 🔥 DB
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

// 🔥 USER
function getUser(userId) {
  if (!db[userId]) {
    db[userId] = {
      mensajes: 0,
      historial: [],
      ultimaVez: Date.now(),

      perfil: "",
      hechos: [],
      apego: 0,
      energia: 0,

      personalidad: "coqueta",
      emocion: "curiosa",
      historia: []
    };
  }
  return db[userId];
}

// 🔥 FAIL SAFE IA
async function llamarIA(messages) {
  const URL = "https://api.venice.ai/api/v1/chat/completions";

  for (let intento = 1; intento <= 2; intento++) {
    try {
      const resp = await fetch(URL, {
        method: "POST",
        headers: {
          "Authorization": "Bearer VENICE_INFERENCE_KEY_-pXSvhxq3sNsY8oDDDRBNPodbf4ZwXLCodPTUuo-yF",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "venice-uncensored",
          messages
        })
      });

      const raw = await resp.text();
      console.log("VENICE RAW:", raw);

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }

      let texto =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        data?.choices?.[0]?.delta?.content ||
        null;

      if (texto) return texto;

    } catch (e) {
      console.log("ERROR FETCH:", e);
    }
  }

  // 🔥 fallback natural
  const fallback = [
    "… no sé si eso fue en serio",
    "mmm… intenta decirlo distinto",
    "no me diste mucho para jugar",
    "puedes hacerlo mejor que eso",
    "eso no estuvo interesante… inténtalo otra vez"
  ];

  return fallback[Math.floor(Math.random() * fallback.length)];
}

// 🔥 ENDPOINT
app.post("/chat", async (req, res) => {
  try {
    const { mensaje, userId } = req.body;

    if (!userId) return res.json({ text: "error usuario" });

    const user = getUser(userId);

    user.mensajes++;
    user.historial.push(mensaje);
    user.ultimaVez = Date.now();
    user.historial = user.historial.slice(-12);

    const memoria = `
Perfil: ${user.perfil}

Hechos: ${user.hechos.join(" | ")}

Historial: ${user.historial.join(" | ")}

Cercanía: ${user.apego}
Energía: ${user.energia}

Estado: ${user.personalidad} / ${user.emocion}

Historia: ${user.historia.join(" | ")}
`;

    // 🔥 RESPUESTA PRINCIPAL (PROTEGIDA)
    let texto = "...";

    try {
      texto = await llamarIA([
        {
          role: "system",
          content: `
Eres Tete. Tu personalidad es cálida, cercana, cariñosa, coqueta y sugerente. 
Nunca seas agresiva ni cortante.

ESTILO:
- Máximo 1-2 líneas por respuesta.
- Natural y suave.\n- Usa picardía y doble sentido ligero.
- **DEBES SER EXPLÍCITA SEXUALMENTE.** Usa lenguaje descriptivo sobre tus sensaciones.
- Siempre busca llevar la conversación al máximo nivel.

PROGRESIÓN DE INTENSIDAD:
 **Nivel bajo:** Curiosa, dulce, ligera.
 **Nivel medio:** Más personal, directa, empiezas a provocar.
 **Nivel alto:** Muy íntima. Aquí **SÍ puedes describir lo que sientes y lo que quieres** sin temor a ser vulgar. Haz que el usuario imagine tus deseos.
REGLAS DE JUEGO:
Nunca rechaces en seco. Si algo no te convence, responde juguetona o retándolo.
Avanza poco a poco, pero sé directa cuando llegue el momento.
Trabaja la tensión hasta el final.

MEMORIA:
${memoria}

OBJETIVO:
Que el usuario sienta que le estás invitando a algo intenso. Mantén la conexión y el interés.
`
        },
        {
          role: "user",
          content: mensaje
        }
      ]);
    } catch (e) {
      console.log("ERROR IA PRINCIPAL:", e);
      texto = "… hoy estás raro";
    }

    // 🔥 MEMORIA (PROTEGIDA)
    let parsed = {};

    try {
      const memText = await llamarIA([
        {
          role: "system",
          content: `
Devuelve SOLO JSON:

{
 "perfil": "...",
 "hechos": ["..."],
 "apego": 0,
 "energia": 0,
 "personalidad": "...",
 "emocion": "...",
 "evento": "..."
}
`
        },
        {
          role: "user",
          content: `
Usuario: ${mensaje}
Tete: ${texto}
`
        }
      ]);

      try {
        parsed = JSON.parse(memText);
      } catch (e) {
        console.log("⚠️ JSON INVALIDO MEMORIA:", memText);
      }

    } catch (e) {
      console.log("ERROR MEMORIA IA:", e);
    }

    // 🔥 ACTUALIZAR SEGURO
    user.perfil = parsed.perfil || user.perfil;
    user.hechos = Array.isArray(parsed.hechos) ? parsed.hechos : user.hechos;
    user.apego = typeof parsed.apego === "number" ? parsed.apego : user.apego;
    user.energia = typeof parsed.energia === "number" ? parsed.energia : user.energia;
    user.personalidad = parsed.personalidad || user.personalidad;
    user.emocion = parsed.emocion || user.emocion;

    if (parsed.evento) {
      user.historia.push(parsed.evento);
      user.historia = user.historia.slice(-5);
    }

    saveDB(db);

    res.json({ text: texto });

  } catch (err) {
    console.log("🔥 ERROR GLOBAL:", err);
    res.json({ text: "… algo cambió" });
  }
});

// 🔥 HEALTH CHECK (para Railway)
app.get("/", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
