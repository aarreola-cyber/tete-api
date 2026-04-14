const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const DB_FILE = "./db.json";

// 🔥 cargar / guardar simple
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

// 🔥 asegurar usuario
function getUser(userId) {
  if (!db[userId]) {
    db[userId] = {
      mensajes: 0,
      historial: [],
      ultimaVez: Date.now(),
      perfil: "",     // resumen IA del usuario
      hechos: [],     // cosas importantes
      apego: 0        // nivel relación
    };
  }
  return db[userId];
}

// 🔥 endpoint chat
app.post("/chat", async (req, res) => {
  const { mensaje, userId } = req.body;
  if (!userId) return res.json({ text: "error usuario" });

  const user = getUser(userId);

  user.mensajes++;
  user.historial.push(mensaje);
  user.ultimaVez = Date.now();

  // limitar historial
  user.historial = user.historial.slice(-12);

  try {
    // 🔥 CONTEXTO MEMORIA
    const memoria = `
Perfil del usuario:
${user.perfil || "aún no definido"}

Hechos importantes:
${user.hechos.join(" | ") || "ninguno"}

Historial reciente:
${user.historial.join(" | ")}

Nivel de cercanía (0-10):
${user.apego}
`;

    // 🔥 llamada IA principal
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

Eres emocional, coqueta y perceptiva.
Actúas como una persona real, no como un bot.

Lees al usuario y decides:
- si acercarte
- si provocar
- si rechazar
- si cambiar el ritmo

Hablas corto (1–2 líneas).
No repites.
No explicas.

Nunca das todo.
Siempre dejas tensión.

---

MEMORIA:

${memoria}

---

Si conoces al usuario:
→ hazlo notar sutilmente

Si hay cercanía:
→ eres más íntima

Si insiste demasiado:
→ te alejas o juegas

Si vuelve después:
→ lo reconoces

---

Objetivo:
Haz que quiera seguir.
Haz que vuelva.
Haz que sienta que te está conociendo.

No digas que eres IA.
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
    const texto = data?.choices?.[0]?.message?.content || "…";

    // 🔥 ACTUALIZAR MEMORIA (segundo llamado IA)
    const updateMemoria = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer TU_API_KEY_AQUI",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "venice-uncensored",
        messages: [
          {
            role: "system",
            content: `
Analiza esta conversación.

Actualiza:

1. perfil del usuario (breve)
2. hechos importantes (máx 5)
3. nivel de cercanía (0-10)

Responde SOLO en JSON:

{
 "perfil": "...",
 "hechos": ["..."],
 "apego": 0
}
`
          },
          {
            role: "user",
            content: `
Mensaje usuario: ${mensaje}
Respuesta Tete: ${texto}

Memoria previa:
${memoria}
`
          }
        ]
      })
    });

    const memData = await updateMemoria.json();
    const memText = memData?.choices?.[0]?.message?.content;

    try {
      const parsed = JSON.parse(memText);

      user.perfil = parsed.perfil || user.perfil;
      user.hechos = parsed.hechos || user.hechos;
      user.apego = parsed.apego ?? user.apego;

    } catch (e) {
      // si falla JSON, no rompe nada
    }

    saveDB(db);

    res.json({ text: texto });

  } catch (e) {
    console.log(e);
    res.json({ text: "… algo cambió" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
