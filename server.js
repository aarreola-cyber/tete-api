const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API funcionando");
});

app.post("/mensaje", (req, res) => {
  res.json({ text: "ya volviste… sabía que no ibas a aguantar" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running on " + PORT));
