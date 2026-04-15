const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL);

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/* ================= USER ================= */

async function getUser(id){
  const data = await redis.get("user:"+id);
  if(data) return JSON.parse(data);

  const nuevo = {
    historial: [],
    memoria_clave: [],
    cercania: 1,
    estado:{externo:"ligera",interno:"curiosa"},
    identidad:{nombre:null},
    lastSeen: Date.now()
  };

  await redis.set("user:"+id, JSON.stringify(nuevo));
  return nuevo;
}

async function saveUser(id,user){
  await redis.set("user:"+id, JSON.stringify(user));
}

/* ================= IA ================= */

async function llamarIA(messages){
  try{
    const resp = await fetch("https://api.venice.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":"Bearer " + process.env.VENICE_API_KEY,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:"venice-uncensored",
        messages: messages.map(m=>({
          role: m.role || "user",
          content: String(m.content)
        })),
        temperature:0.9,
        max_tokens:80
      })
    });

    const text = await resp.text();
    console.log("VENICE RAW:", text);

    let data;
    try{
      data = JSON.parse(text);
    }catch{
      return "… error parse";
    }

    return data?.choices?.[0]?.message?.content || "… sigo aquí";

  }catch(e){
    console.log("ERROR IA:", e.message);
    return "… sigo aquí";
  }
}
/* ================= CHAT ================= */

app.post("/chat", async (req,res)=>{

  try{
    const {mensaje,userId} = req.body;

    const user = await getUser(userId);

    user.lastSeen = Date.now();

    user.historial.push(mensaje);
    user.historial = user.historial.slice(-6);

    if(!user.identidad.nombre){
      const m = mensaje.match(/me llamo (\w+)/i);
      if(m) user.identidad.nombre = m[1];
    }

    if(user.cercania < 100){
      user.cercania += 0.2;
    }

    const respuesta = await llamarIA([
      {
        role:"system",
        content:`
Eres Tete.

Cercanía: ${user.cercania}
Estado: ${user.estado.externo}

Usuario: ${user.identidad.nombre || "..."}

Hablas natural, corto, con intención.
No explicas.
Generas cercanía ligera.
`
      },
      {
        role:"user",
        content:mensaje
      }
    ]);

    await saveUser(userId,user);

    res.json({text:respuesta});

  }catch(e){
    console.log("ERROR:",e);
    res.json({text:"… sigo aquí"});
  }
});

app.listen(process.env.PORT||3000,()=>console.log("running"));
