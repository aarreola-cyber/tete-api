const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const memoria = {};

// 🔹 delay humano
function delay(min = 800, max = 2000) {
  return new Promise(r => setTimeout(r, Math.random() * (max - min) + min));
}

// 🔹 evita repetir respuesta
function pick(arr, last) {
  let opciones = arr.filter(x => x !== last);
  if (opciones.length === 0) opciones = arr;
  return opciones[Math.floor(Math.random() * opciones.length)];
}

function responder(mensaje, userId) {
  const msg = (mensaje || "").toLowerCase();

  if (!memoria[userId]) {
    memoria[userId] = {
      step: 0,
      mood: "warm",
      last: "",
      turns: 0
    };
  }

  const m = memoria[userId];
  m.turns++;

  // 🔹 cambia mood
  if (m.turns % 4 === 0) {
    m.mood = pick(["warm", "curious", "distant"], m.mood);
  }

  // 🔹 entrada fuerte
  if (m.step === 0) {
    m.step++;
    const r = pick([
      "ya te había visto…",
      "te tardaste",
      "sabía que ibas a escribir",
      "sí eras tú…",
      "pasaste varias veces y nada…"
    ], m.last);
    m.last = r; return r;
  }

  // 🔹 saludo con enganche
  if (/hola|hey|buenas/.test(msg)) {
    const r = pick([
      "ya te había visto…",
      "te tardaste",
      "pensé que no ibas a hablar",
      "hola… al fin"
    ], m.last);
    m.last = r; return r;
  }

  if (/como estas|cómo estás|que tal/.test(msg)) {
    const r = pick([
      "bien… contigo mejor",
      "tranquila… y tú?",
      "normal… me distraes"
    ], m.last);
    m.last = r; return r;
  }

  if (/que haces|qué haces/.test(msg)) {
    const r = pick([
      "nada… pensando",
      "viendo si aparecías",
      "aquí… perdiendo el tiempo"
    ], m.last);
    m.last = r; return r;
  }

  if (/nombre|como te llamas/.test(msg)) {
    const r = pick([
      "mm… dime tú primero",
      "luego te digo",
      "para qué quieres saber…"
    ], m.last);
    m.last = r; return r;
  }

  // 🔹 enganche
  if (m.step < 5) {
    m.step++;

    const base = [
      "no eres como los demás…",
      "me caes bien… no sé por qué",
      "te estoy leyendo…",
      "no te hagas…",
      "te noté desde antes",
      "tienes algo raro…"
    ];

    const warm = [
      "me gusta cuando apareces",
      "contigo es más fácil"
    ];

    const curious = [
      "qué pensaste cuando me viste?",
      "por qué tardaste tanto?"
    ];

    const distant = [
      "no siempre contesto…",
      "a veces desaparezco"
    ];

    const pool = base.concat(
      m.mood === "warm" ? warm :
      m.mood === "curious" ? curious :
      distant
    );

    const r = pick(pool, m.last);
    m.last = r; return r;
  }

  // 🔹 medio
  if (m.step < 8) {
    m.step++;
    const r = pick([
      "aquí no me gusta hablar tanto…",
      "siento que aquí todo se pierde",
      "luego te digo…",
      "no es lo mismo aquí…"
    ], m.last);
    m.last = r; return r;
  }

  // 🔹 celos leve
  if (m.step < 11) {
    m.step++;
    const r = pick([
      "seguro así le hablas a todas",
      "no creo que solo me escribas a mí…",
      "a ver si sí te quedas…"
    ], m.last);
    m.last = r; return r;
  }

  // 🔹 pre cierre
  if (m.step < 13) {
    m.step++;
    const r = pick([
      "prefiero cuando es más privado…",
      "aquí no me siento tan cómoda",
      "allá hablo más tranquila…"
    ], m.last);
    m.last = r; return r;
  }

  // 🔹 cierre
  const r = pick([
    "si quieres seguir conmigo… estoy acá",
    "allá te cuento mejor…",
    "si quieres seguir hablando conmigo… estoy acá"
  ], m.last);

  m.last = r;
  return r;
}

// 🔻 endpoint
app.post("/chat", async (req, res) => {
  const { mensaje, userId } = req.body;

  if (!mensaje || !userId) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  await delay(); // simula humano

  const reply = responder(mensaje, userId);

  res.json({ text: reply });
});

app.get("/", (req, res) => {
  res.send("TT API v2 funcionando");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server corriendo en " + PORT));
