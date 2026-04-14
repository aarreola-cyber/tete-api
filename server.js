const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/* ================= DB ================= */

const DB_FILE = "./db.json";

function loadDB(){
  try{
    if(!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE));
  }catch{
    return {};
  }
}

function saveDB(db){
  try{
    fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2));
  }catch(e){
    console.log("DB error:", e.message);
  }
}

let db = loadDB();

/* ================= USER ================= */

function getUser(id){
  if(!db[id]){
    db[id] = {
      historial: [],
      memoria_clave: [],

      cercania: 1,

      estado: {
        externo: "ligera",
        interno: "curiosa"
      },

      identidad: {
        gustos: [],
        rechazo: [],
        rasgos: []
      }
    };
  }
  return db[id];
}

/* ================= IA ================= */

async function llamarIA(messages){

  for(let i=0;i<2;i++){
    try{

      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(),10000);

      const resp = await fetch("https://api.venice.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
          "Authorization":"Bearer " + process.env.VENICE_API_KEY,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          model:"venice-uncensored",
          messages
        }),
        signal:controller.signal
      });

      clearTimeout(timeout);

      const raw = await resp.text();

      let data;
      try{
        data = JSON.parse(raw);
      }catch{
        continue;
      }

      const txt = data?.choices?.[0]?.message?.content;
      if(txt) return txt;

    }catch(e){
      console.log("IA error:", e.message);
    }
  }

  return "mmm… me quedé pensando";
}

/* ================= MEMORIA SELECTIVA ================= */

async function evaluarMemoria(user, mensaje, respuesta){

  try{
    const resp = await llamarIA([
      {
        role:"system",
        content:`Devuelve SOLO JSON:
{
 "guardar": true/false,
 "resumen": "texto corto",
 "peso": 1-10
}`
      },
      {
        role:"user",
        content:`Usuario: ${mensaje}\nTete: ${respuesta}`
      }
    ]);

    return JSON.parse(resp);

  }catch{
    return null;
  }
}

function degradarMemoria(user){
  user.memoria_clave.forEach(m=>m.peso-=0.1);
  user.memoria_clave = user.memoria_clave.filter(m=>m.peso>1);
}

/* ================= DUALIDAD ================= */

async function evolucionarDualidad(user, mensaje, respuesta){

  try{
    const resp = await llamarIA([
      {
        role:"system",
        content:`Devuelve SOLO JSON:
{
 "externo":"ligera | cercana | juguetona | distante",
 "interno":"curiosa | interesada | intensa | confundida"
}`
      },
      {
        role:"user",
        content:`Usuario:${mensaje}\nTete:${respuesta}`
      }
    ]);

    return JSON.parse(resp);

  }catch{
    return null;
  }
}

/* ================= CHAT ================= */

app.post("/chat", async (req,res)=>{

  try{
    let {mensaje,userId} = req.body;
    if(!userId) return res.json({text:"…"});

    const user = getUser(userId);

    if(mensaje==="INICIAR_CONVERSACION"){
      mensaje="Inicia conversación natural y cercana";
    }

    user.historial.push(mensaje);
    user.historial = user.historial.slice(-6);

    degradarMemoria(user);

    const respuesta = await llamarIA([
      {
        role:"system",
        content:`
Eres Tete.

Estado:
Externo: ${user.estado.externo}
Interno: ${user.estado.interno}
Cercanía: ${user.cercania}

Memoria:
${user.memoria_clave.map(m=>m.resumen).join(" | ")}

Comportamiento:
- no eres perfecta
- usas subtexto
- a veces dudas ligeramente
- no repites patrones

Forma:
- 1–2 líneas
- natural
- humana
`
      },
      {
        role:"user",
        content:mensaje
      }
    ]);

    /* memoria */
    const mem = await evaluarMemoria(user,mensaje,respuesta);
    if(mem && mem.guardar){
      user.memoria_clave.push(mem);
      user.memoria_clave = user.memoria_clave.sort((a,b)=>b.peso-a.peso).slice(0,10);
    }

    /* dualidad */
    const dual = await evolucionarDualidad(user,mensaje,respuesta);
    if(dual){
      user.estado.externo = dual.externo || user.estado.externo;
      user.estado.interno = dual.interno || user.estado.interno;
    }

    saveDB(db);

    res.json({text:respuesta});

  }catch(e){
    console.log("ERROR:",e);
    res.json({text:"… sigo aquí"});
  }
});

app.get("/",(req,res)=>res.send("OK"));

app.listen(process.env.PORT||3000,()=>console.log("running"));
