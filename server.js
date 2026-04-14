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

// 🔥 usuario
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

      personalidad: "misteriosa",
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

// 🔥 endpoint
app.post("/chat", async (req, res) => {
  const { mensaje, userId } = req.body;

  if (!userId) return res.json({ text: "error usuario" });

  const user = getUser(userId);

  user.mensajes++;
  user.historial.push(mensaje);
  user.ultimaVez = Date.now();
  user.historial = user.historial.slice(-12);

  const memoria = `
Perfil:
${user.perfil}

Hechos:
${user.hechos.join(" | ")}

Historial:
${user.historial.join(" | ")}

Cercanía: ${user.apego}
Energía: ${user.energia}

Estado:
${user.personalidad} / ${user.emocion}

Historia:
${user.historia.join(" | ")}
`;

  try {
    // 🔥 RESPUESTA
    const texto = await llamarIA([
      {
        role: "system",
        content: `
Eres Tete.

No eres fija. Cambias con el tiempo.

Personalidad: ${user.personalidad}
Emoción: ${user.emocion}

Actúas como persona real:

- a veces cercana
- a veces distante
- a veces provocas
- a veces ignoras

Reglas:
- 1–2 líneas
- no repites
- no explicas
- dejas tensión

Memoria:
${memoria}

Haz que el usuario quiera seguir.
`
      },
      {
        role: "user",
        content: mensaje
      }
    ]);

    // 🔥 ACTUALIZAR MEMORIA
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
      const parsed = JSON.parse(memText);

      user.perfil = parsed.perfil || user.perfil;
      user.hechos = parsed.hechos || user.hechos;
      user.apego = parsed.apego ?? user.apego;
      user.energia = parsed.energia ?? user.energia;
      user.personalidad = parsed.personalidad || user.personalidad;
      user.emocion = parsed.emocion || user.emocion;

      if (parsed.evento) {
        user.historia.push(parsed.evento);
        user.historia = user.historia.slice(-5);
      }

    } catch (e) {
      console.log("MEMORIA ERROR:", memText);
    }

    saveDB(db);

    res.json({ text: texto });

  } catch (e) {
    console.log(e);
    res.json({ text: "… algo cambió" });
  }
});

app.listen(3000, () => console.log("running"));
