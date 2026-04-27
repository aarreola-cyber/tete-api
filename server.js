const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// memoria por usuario
const memoria = {};

function pick(arr, last) {
  // evita repetir la última respuesta
  let opciones = arr.filter(x => x !== last);
  if (opciones.length === 0) opciones = arr;
  return opciones[Math.floor(Math.random() * opciones.length)];
}

function responder(mensaje, userId) {
  const msg = (mensaje || "").toLowerCase();

  if (!memoria[userId]) {
    memoria[userId] = {
      step: 0,
      mood: "warm", // warm | curious | distant
      last: "",
      turns: 0
    };
  }

  const m = memoria[userId];
  m.turns++;

  // 🔹 rotación de mood (cada 3–4 turnos)
  if (m.turns % 4 === 0) {
    m.mood = pick(["warm", "curious", "distant"], m.mood);
  }

  // 🔹 entrada
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

  // 🔹 triggers simples
  if (/hola|hey|buenas/.test(msg)) {
    const r = pick(["hola…", "mm hola", "hola… al fin"], m.last);
    m.last = r; return r;
  }

  if (/cómo estás|como estas|que tal/.test(msg)) {
    const r = pick([
      "bien… contigo mejor",
      "tranquila… y tú?",
      "normal… me distraes"
    ], m.last);
    m.last = r; return r;
  }

  if (/qué haces|que haces/.test(msg)) {
    const r = pick([
      "nada… pensando",
      "aquí… perdiendo el tiempo",
      "viendo si aparecías"
    ], m.last);
    m.last = r; return r;
  }

  if (/nombre|cómo te llamas|como te llamas/.test(msg)) {
    const r = pick([
      "mm… dime tú primero",
      "para qué quieres saber…",
      "luego te digo"
    ], m.last);
    m.last = r; return r;
  }

  if (/dónde|donde|de dónde|de donde/.test(msg)) {
    const r = pick([
      "cerca… supongo",
      "no tan lejos",
      "depende de ti"
    ], m.last);
    m.last = r; return r;
  }

  // 🔹 enganche (steps 1–4)
  if (m.step < 5) {
    m.step++;
    const base = [
      "no eres como los demás…",
      "pensé que no ibas a hablar",
      "me caes bien… no sé por qué",
      "te estoy leyendo…",
      "no te hagas…",
      "te noté desde antes",
      "tienes algo raro…",
      "no sé si confiar en ti…"
    ];
    const warm = [
      "me gusta cuando apareces",
      "contigo es más fácil",
      "te quedas más de lo normal"
    ];
    const curious = [
      "qué pensaste cuando me viste?",
      "eres más de observar o hablar?",
      "por qué tardaste tanto?"
    ];
    const distant = [
      "a veces desapareces…",
      "no siempre contesto…",
      "no me gusta hablar mucho aquí"
    ];
    const pool = base.concat(m.mood === "warm" ? warm : m.mood === "curious" ? curious : distant);
    const r = pick(pool, m.last);
    m.last = r; return r;
  }

  // 🔹 fase media (steps 5–7)
  if (m.step >= 5 && m.step < 8) {
    m.step++;
    const pool = [
      "aquí no me gusta hablar tanto…",
      "siento que aquí todo se pierde",
      "luego te digo…",
      "no sé si debería decirte…",
      "no es lo mismo aquí…",
      "me distraen aquí…"
    ];
    const r = pick(pool, m.last);
    m.last = r; return r;
  }

  // 🔹 micro celos / inversión (steps 8–10)
  if (m.step >= 8 && m.step < 11) {
    m.step++;
    const pool = [
      "seguro así le hablas a todas",
      "no creo que solo me escribas a mí…",
      "a ver si sí te quedas…",
      "no me gusta cuando desaparecen"
    ];
    const r = pick(pool, m.last);
    m.last = r; return r;
  }

  // 🔹 pre-cierre (steps 11–12)
  if (m.step >= 11 && m.step < 13) {
    m.step++;
    const pool = [
      "prefiero cuando es más privado…",
      "aquí no me siento tan cómoda",
      "allá hablo más tranquila…"
    ];
    const r = pick(pool, m.last);
    m.last = r; return r;
  }

  // 🔹 cierre
  const r = pick([
    "si quieres seguir conmigo… estoy acá",
    "si quieres seguir hablando conmigo… estoy acá",
    "allá te cuento mejor…"
  ], m.last);
  m.last = r;
  return r;
}

app.post("/chat", (req, res) => {
  const { mensaje, userId } = req.body;
  if (!mensaje || !userId) {
    return res.status(400).json({ error: "Faltan datos" });
  }
  const reply = responder(mensaje, userId);
  res.json({ text: reply });
});

app.get("/", (req, res) => {
  res.send("TT API v2 sin IA funcionando");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server corriendo en " + PORT));
