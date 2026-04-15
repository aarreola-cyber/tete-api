const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= IA ================= */

async function llamarIA(mensaje){
  try{
    const resp = await fetch("https://api.venice.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization": `Bearer ${process.env.VENICE_API_KEY.trim()}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        model:"venice-uncensored",
        messages:[
          { role:"user", content: mensaje }
        ],
        temperature:0.9,
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

    return (
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      data?.response ||
      raw ||
      "…"
    );

  }catch(e){
    console.log("ERROR IA:", e.message);
    return "…";
  }
}

/* ================= CHAT ================= */

app.post("/chat", async (req,res)=>{
  try{
    const {mensaje} = req.body;

    if(!mensaje){
      return res.json({text:"… dime algo"});
    }

    const respuesta = await llamarIA(mensaje);

    res.json({text:respuesta});

  }catch(e){
    console.log("ERROR CHAT:", e.message);
    res.json({text:"…"});
  }
});

/* ================= ROOT ================= */

app.get("/", (req,res)=>{
  res.send("Tete API OK");
});

/* ================= START ================= */

app.listen(process.env.PORT || 3000, ()=>{
  console.log("running");
});
