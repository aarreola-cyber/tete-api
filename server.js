const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/* ================= REDIS (opcional) ================= */

let redis = null;

try{
  const Redis = require("ioredis");
  redis = new Redis(process.env.REDIS_URL);

  redis.on("error", (e)=>{
    console.log("Redis error, usando modo sin memoria");
    redis = null;
  });

}catch(e){
  console.log("Redis no disponible");
}

/* ================= USER ================= */

async function getUser(id){

  if(!redis){
    return {
      historial: [],
      cercania: 1,
      identidad:{nombre:null}
    };
  }

  try{
    const data = await redis.get("user:"+id);
    if(data) return JSON.parse(data);
  }catch(e){
    redis = null;
  }

  const nuevo = {
    historial: [],
    cercania: 1,
    identidad:{nombre:null}
  };

  if(redis){
    await redis.set("user:"+id, JSON.stringify(nuevo));
  }

  return nuevo;
}

async function saveUser(id,user){
  if(!redis) return;
  try{
    await redis.set("user:"+id, JSON.stringify(user));
  }catch(e){
    redis = null;
  }
}

/* ================= IA ================= */

async function llamarIA(mensaje){
  try{
    const resp = await fetch("https://api.venice.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.VENICE_API_KEY.trim()}`
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:"venice-uncensored",
        messages:[
          { role:"user", content: mensaje }
        ],
        temperature:0.9,
        max_tokens:80
      })
    });

    const raw = await resp.text();
    console.log("VENICE:", raw);

    let data;
    try{
      data = JSON.parse(raw);
    }catch{
      return "…";
    }

    return data?.choices?.[0]?.message?.content || "…";

  }catch(e){
    console.log("ERROR IA:", e.message);
    return "…";
  }
}

/* ================= CHAT ================= */

app.post("/chat", async (req,res)=>{

  try{
    const {mensaje,userId} = req.body;

    const user = await getUser(userId);

    user.historial.push(mensaje);
    user.historial = user.historial.slice(-5);

    if(!user.identidad.nombre){
      const m = mensaje.match(/me llamo (\w+)/i);
      if(m) user.identidad.nombre = m[1];
    }

    if(user.cercania < 100){
      user.cercania += 0.2;
    }

    const respuesta = await llamarIA(mensaje);

    await saveUser(userId,user);

    res.json({text:respuesta});

  }catch(e){
    console.log("ERROR:", e);
    res.json({text:"…"});
  }
});

/* ================= ROOT ================= */

app.get("/",(req,res)=>res.send("Tete API OK"));

/* ================= START ================= */

app.listen(process.env.PORT||3000,()=>console.log("running"));
