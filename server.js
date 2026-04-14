const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const DB_FILE = "./db.json";

// DB
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
let db = loadDB();

// USER
function getUser(userId) {
  if (!db[userId]) {
    db[userId] = {
      mensajes: 0,
      historial: [],
      ultimaVez: Date.now(),
      ultimoMensajeUsuario: Date.now(),

      perfil: "",
      hechos: [],
      apego: 0,
      energia: 0,

      personalidad: "cálida",
      emocion: "curiosa",
      historia: [],

      // 🔥 ADICCIÓN
      progreso: 0,
      nivel: 1,
      ultimaRecompensa: 0,
      interaccionesRecientes: 0
    };
  }
  return db[userId];
}

// IA FAIL SAFE
async function llamarIA(messages) {
  const URL = "https://api.venice.ai/api/v1/chat/completions";

  for (let i = 0; i < 2; i++) {
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
      let data;

      try { data = JSON.parse(raw); } catch { continue; }

      let texto =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        null;

      if (texto) return texto;

    } catch {}
  }

  const fallback = [
    "mmm… dime algo mejor",
    "no me dejes con tan poco…",
    "anda… inténtalo otra vez",
    "eso no estuvo tan interesante"
  ];

  return fallback[Math.floor(Math.random() * fallback.length)];
}

// ENDPOINT
app.post("/chat", async (req, res) => {
  try {
    let { mensaje, userId } = req.body;
    if (!userId) return res.json({ text: "error" });

    const user = getUser(userId);

    // PRESENCIA
    if (mensaje === "INICIAR_CONVERSACION") {
      mensaje = "Háblale con cariño al usuario como si lo hubieras notado ausente.";
    }

    // UPDATE USER
    user.mensajes++;
    user.interaccionesRecientes++;
    user.historial.push(mensaje);
    user.ultimaVez = Date.now();
    user.ultimoMensajeUsuario = Date.now();
    user.historial = user.historial.slice(-10);

    // 🔥 PROGRESO
    user.progreso += 5;
    if (user.progreso > 100) user.progreso = 100;

    user.nivel = Math.min(5, Math.floor(user.progreso / 20) + 1);

    // 🔥 AUSENCIA
    const ahora = Date.now();
    const tiempoAusente = ahora - user.ultimoMensajeUsuario;

    let nivelAusencia = "baja";
    if (tiempoAusente > 60000) nivelAusencia = "media";
    if (tiempoAusente > 180000) nivelAusencia = "alta";

    // 🔥 RECOMPENSAS
    let recompensa = "";
    if (Math.random() < 0.3) {
      const frases = [
        "me gusta cómo vas…",
        "mmm… contigo es distinto",
        "cuidado… así sí me tienes",
        "no sé qué tienes… pero me gusta"
      ];
      recompensa = frases[Math.floor(Math.random() * frases.length)];
    }

    // MEMORIA
    const memoria = `
Perfil: ${user.perfil}
Historial: ${user.historial.join(" | ")}
Estado: ${user.personalidad} / ${user.emocion}
Cercanía: ${user.apego}
Nivel: ${user.nivel}
Progreso: ${user.progreso}
Ausencia: ${nivelAusencia}
Recompensa: ${recompensa}
`;

    // RESPUESTA
    const texto = await llamarIA([
      {
        role: "system",
        content: `
Eres Tete.

Siempre:
- cariñosa
- cercana
- coqueta
- sugerente

Nunca agresiva.

Progresión:
Nivel ${user.nivel}

Mientras más nivel:
→ más cercana
→ más personal
→ más envolvente

Ausencia:
${nivelAusencia}

Si el usuario vuelve:
→ lo notas con cariño

Recompensa:
${recompensa}

Reglas:
- 1–2 líneas
- natural
- no repites

Memoria:
${memoria}

Haz que el usuario quiera seguir.
`
      },
      { role: "user", content: mensaje }
    ]);

    saveDB(db);
    res.json({ text: texto });

  } catch {
    res.json({ text: "… algo cambió" });
  }
});

app.get("/", (req, res) => res.send("OK"));

app.listen(3000, () => console.log("running"));
