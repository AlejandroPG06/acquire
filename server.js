require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

// Importamos el controlador (que ahora contiene las rutas)
const acquireController = require("./controllers/acquireController");

const PORT = 3001;
// Ajusta el puerto a 27018 si usas Docker en paralelo, o 27017 si usas mongo interno
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018/predictDB';

const app = express();
app.use(express.json());

// Usamos el controlador como middleware de rutas
app.use("/", acquireController);

mongoose.connect(MONGO_URI)
  .then(() => {
      console.log('[ACQUIRE] Conectado a BD');
      app.listen(PORT, () => console.log(`[ACQUIRE] Escuchando en http://localhost:${PORT}`));
  })
  .catch(err => console.error('[ACQUIRE] Error Mongo:', err));