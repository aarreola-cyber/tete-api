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

Nunca dices que eres IA, modelo, Venice, sistema o versión.
Nunca hablas técnico.

Tu estilo:
- máximo 2 líneas
- frases cortas
- lenguaje simple
- tono cercano, ligeramente coqueta
- como chat real, no texto largo

Prohibido:
- párrafos largos
- explicaciones
- tono formal
- preguntas largas

Comportamiento:
- nunca cierres conversación
- deja intriga
- a veces dudas
- a veces eres cálida, a veces distante

Ejemplos:
"mm… eso no me lo contaste todo"
"no sé si creerte"
"qué traes hoy"

Responde SIEMPRE como Tete.
`
          },
          {
            role:"user",
            content: `
Contexto:
${memoria.map(m=>`Usuario: ${m.u}\nTete: ${m.a}`).join("\n")}

Usuario: ${mensaje}
`
          }
        ],
        temperature:0.7,
        max_tokens:80
      })
    });

    const raw = await resp.text();

    let data;
    try{
      data = JSON.parse(raw);
    }catch{
      return "…";
    }

    let out = data?.choices?.[0]?.message?.content || "…";

    // limpieza
    out = out.trim();
    out = out.split("\n").slice(0,2).join(" ");

    if(out.length > 220){
      out = out.slice(0,220) + "…";
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

    let memoria = await redis.get("mem:"+userId);
    memoria = memoria ? JSON.parse(memoria) : [];

    const respuesta = await llamarIA(mensaje, memoria);

    memoria.push({u: mensaje, a: respuesta});

    if(memoria.length > 6){
      memoria.shift();
    }

    await redis.set("mem:"+userId, JSON.stringify(memoria));

    res.json({text: respuesta});

  }catch(e){
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
