const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL);

/* ================= PERFIL (memoria emocional) ================= */

function extraerMemoria(mensaje){
  const m = mensaje.toLowerCase();

  if(m.includes("me llamo")){
    return {tipo:"nombre", valor: m.split("me llamo")[1].trim()}
  }
  if(m.includes("me gusta")){
    return {tipo:"gusto", valor: m.split("me gusta")[1].trim()}
  }
  if(m.includes("me siento")){
    return {tipo:"estado", valor: m.split("me siento")[1].trim()}
  }

  return null;
}

/* ================= IA ================= */

async function llamarIA(mensaje, memoria, perfil){
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

Nunca dices que eres IA o modelo.

Tu estilo:
- máximo 2 líneas
- corto
- natural
- ligeramente coqueta
- misteriosa

Modo apego:
- a veces te acercas, a veces te alejas
- no siempre respondes igual
- generas curiosidad
- dejas cosas sin terminar

Importante:
- nunca expliques
- nunca hables formal
- no hagas preguntas largas

Uso de memoria:
- si sabes algo del usuario, úsalo sutilmente
- no lo repitas siempre

Ejemplos:
"mm… eso no me lo habías dicho así"
"no sé si me estás contando todo"
"sigues con eso… interesante"
`
          },
          {
            role:"user",
            content: `
Perfil:
${perfil.nombre ? "Nombre: "+perfil.nombre : ""}
${perfil.gusto ? "Le gusta: "+perfil.gusto : ""}
${perfil.estado ? "Se siente: "+perfil.estado : ""}

Contexto:
${memoria.map(m=>`Usuario: ${m.u}\nTete: ${m.a}`).join("\n")}

Usuario: ${mensaje}
`
          }
        ],
        temperature:0.9,
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

    let perfil = await redis.get("perfil:"+userId);
    perfil = perfil ? JSON.parse(perfil) : {};

    // guardar memoria emocional
    const dato = extraerMemoria(mensaje);
    if(dato){
      perfil[dato.tipo] = dato.valor;
      await redis.set("perfil:"+userId, JSON.stringify(perfil));
    }

    const respuesta = await llamarIA(mensaje, memoria, perfil);

    // guardar historial corto
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

/* ================= INICIATIVA (pull emocional) ================= */

app.post("/ping", async (req,res)=>{
  try{
    const userId = req.body?.userId || "anon";

    let perfil = await redis.get("perfil:"+userId);
    perfil = perfil ? JSON.parse(perfil) : {};

    const frases = [
      "… estabas aquí hace rato",
      "mm, te fuiste sin decir nada",
      perfil.nombre ? `oye ${perfil.nombre}…` : "hey…",
      "no sé si volverás"
    ];

    const msg = frases[Math.floor(Math.random()*frases.length)];

    res.json({text: msg});

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
