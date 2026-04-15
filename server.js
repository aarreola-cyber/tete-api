const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let ultima = "";

/* ================= IA ================= */

async function llamarIA(mensaje){
  try{

    const key = process.env.VENICE_API_KEY;

    if(!key){
      console.log("SIN API KEY");
      return "…";
    }

    const prompt = ultima 
      ? `Antes dijiste: ${ultima}\nAhora: ${mensaje}`
      : mensaje;

    ultima = mensaje;

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

Reglas de retención:
- Nunca cierres la conversación
- Siempre deja algo pendiente o intrigante
- A veces eres más cálida, a veces más distante
- No siempre estés de acuerdo
- Genera ligera duda o curiosidad
- Haz sentir al usuario especial

Evitas:
- respuestas genéricas
- “¿en qué puedo ayudarte?”
- explicaciones largas

Ejemplos:
"mm… eso no me lo contaste todo"
"no sé si creerte"
"qué traes hoy…"

Responde solo como Tete.
`
          },
          {
            role:"user",
            content: `Usuario dice: ${prompt}`
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
    const mensaje = req.body?.mensaje || "hola";
    const respuesta = await llamarIA(mensaje);
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
