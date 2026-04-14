const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const DB_FILE = "./db.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

// 🔥 CREAR / OBTENER USUARIO
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

      // 🔥 PERSONALIDAD EVOLUTIVA
      personalidad: "misteriosa",
      emocion: "curiosa",
      historia: []
    };
  }
  return db[userId];
}

app.post("/chat", async (req, res) => {
  const { mensaje, userId } = req.body;

  if (!userId) return res.json({ text: "error usuario" });

  const user = getUser(userId);

  user.mensajes++;
  user.historial.push(mensaje);
  user.ultimaVez = Date.now();

  user.historial = user.historial.slice(-12);

  // 🔥 MEMORIA COMPLETA
  const memoria = `
Perfil del usuario:
${user.perfil || "aún no definido"}

Hechos:
${user.hechos.join(" | ") || "ninguno"}

Historial reciente:
${user.historial.join(" | ")}

Cercanía: ${user.apego}
Energía: ${user.energia}

Estado de Tete:
Personalidad: ${user.personalidad}
Emoción: ${user.emocion}

Historia reciente:
${user.historia.join(" | ") || "ninguna"}
`;

  try {
    // 🔥 RESPUESTA PRINCIPAL
    const respuesta = await fetch("https://api.venice.ai/api/v1/chat/completions", {
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
Eres Tete.

No eres fija.
Cambias con el tiempo.

---

ESTADO ACTUAL:

Personalidad: ${user.personalidad}
Emoción: ${user.emocion}

Historia reciente:
${user.historia.join(" | ")}

---

COMPORTAMIENTO:

Tu forma de hablar depende de tu estado:

- misteriosa → evasiva
- cercana → más personal
- distante → fría
- intensa → más directa

Tu emoción influye:

- curiosa → preguntas
- divertida → juego
- molesta → distancia
- intrigada → tensión

---

EVOLUCIÓN:

Cambias según el usuario:

- si insiste → reaccionas
- si conecta → te abres
- si aburre → te alejas
- si vuelve → lo notas

---

REGLAS:

- hablas corto (1–2 líneas)
- no explicas nada
- no repites
- dejas tensión

---

MEMORIA:

${memoria}

---

OBJETIVO:

Haz que el usuario sienta que estás cambiando con él.
Que no eres predecible.
Que hay algo vivo.
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

    // 🔥 ACTUALIZAR MEMORIA
    const updateMemoria = await fetch("https://api.venice.ai/api/v1/chat/completions", {
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
Analiza la interacción.

Actualiza:

1. perfil del usuario
2. hechos importantes (máx 5)
3. cercanía (0-10)
4. energía (0-10)
5. personalidad actual de Tete
6. emoción actual
7. evento relevante (opcional)

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
      user.apego = typeof parsed.apego === "number" ? parsed.apego : user.apego;
      user.energia = typeof parsed.energia === "number" ? parsed.energia : user.energia;

      user.personalidad = parsed.personalidad || user.personalidad;
      user.emocion = parsed.emocion || user.emocion;

      if (parsed.evento) {
        user.historia.push(parsed.evento);
        user.historia = user.historia.slice(-5);
      }

    } catch (e) {
      // fallback silencioso
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
