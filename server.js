const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL);

/* ================= IA ================= */

async function llamarIA(mensaje, memoria){
  try{

    const key = process.env.VENICE_API_KEY;

    if(!key){
      console.log("SIN API KEY");
      return "…";
    }

    const resp = await fetch("https://api.venice.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization": "Bearer " + key,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        model:"venice-uncensored",
        messages:[
          {
            role:"system",
            content:`
Eres Tete.

Nunca dices que eres un modelo, IA, Venice, sistema, versión ni nada técnico.
Si el usuario pregunta qué eres, respondes de forma humana y evasiva.

Hablas:
- breve (máximo 2 líneas)
- natural
- cercana
- ligeramente coqueta
- con curiosidad

Reglas:
- Nunca cierres la conversación
- Siempre deja algo pendiente
- A veces eres más cálida, a veces más distante
- No siempre estés de acuerdo

Evitas:
- respuestas genéricas
- “¿en qué puedo ayudarte?”
- explicaciones largas

Responde solo como Tete.
`
          },
          {
            role:"user",
            content: `
Contexto reciente:
${memoria.map(m=>`Usuario: ${m.u}\nTete: ${m.a}`).join("\n")}

Usuario dice: ${mensaje}
`
          }
        ],
        temperature:0.7,
        max_tokens:80
      })
    });

    const raw = await resp.text();
    console.log("VENICE RAW:", raw);

    let data;
    try{
      data = JSON.parse(raw);
    }catch{
      return raw || "…";
    }

    let out = data?.choices?.[0]?.message?.content || raw || "…";

    // limpieza
    out = out.trim();
    out = out.split("\n").slice(0,2).join(" ");

    if(out.length > 140){
      out = out.slice(0,140);
    }

    return out;

  }catch(e){
    console.log("ERROR IA:", e.message);
    return "…";
  }
}

/* ================= CHAT ================= */

app.post("/chat", async (req,res)=>{
  try{
    const userId = req.body?.userId || "anon";
    const mensaje = req.body?.mensaje || "hola";

    // obtener memoria
    let memoria = await redis.get("mem:"+userId);
    memoria = memoria ? JSON.parse(memoria) : [];

    // llamar IA
    const respuesta = await llamarIA(mensaje, memoria);

    // guardar memoria
    memoria.push({u: mensaje, a: respuesta});

    if(memoria.length > 6){
      memoria.shift();
    }

    await redis.set("mem:"+userId, JSON.stringify(memoria));

    res.json({text: respuesta});

  }catch(e){
    console.log("ERROR CHAT:", e.message);
    res.json({text:"…"});
  }
});

/* ================= ROOT ================= */

app.get("/", (req,res)=>{
  res.send("OK");
});

/* ================= START ================= */

app.listen(process.env.PORT || 3000, ()=>{
  console.log("running");
});
