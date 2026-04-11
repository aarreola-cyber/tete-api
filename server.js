import express from "express";

const app = express();
app.use(express.json());

app.post("/mensaje", (req, res) => {
  res.json({ text: "ya volviste… sabía que no ibas a aguantar" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
