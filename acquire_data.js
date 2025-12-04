// acquire/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

// --- CONFIGURACIÓN ---
const PORT = 3001;
// Usamos el puerto 27018 si lo estás ejecutando en local mientras Docker corre en el 27017
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018/predictDB';

// --- 1. DEFINICIÓN DEL MODELO (BD) ---
const AcquiredDataSchema = new mongoose.Schema({
    features: { type: [Number], required: true },
    featureCount: { type: Number, default: 7 },
    scalerVersion: { type: String, default: "v1" },
    createdAt: { type: Date, default: Date.now },
    targetDate: { type: Date, required: true },
    dailyValues: { type: [Number], required: true },
    kunnaMeta: { alias: String, name: String, daysUsed: [String] },
    fetchMeta: { timeStart: Date, timeEnd: Date, source: { type: String, default: "acquire" } }
});
const AcquiredData = mongoose.model('AcquiredData', AcquiredDataSchema);

// --- 2. LÓGICA DE NEGOCIO (SERVICIOS) ---
const KUNNA_URL = "https://openapi.kunna.es/data/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM2NDEwNjB9.ixb4O5Jgk-e_oPMSsycpD7A_iGVqIl4Ijl2a_kLrT94";
const ALIAS = "6339651";

// Calcular fechas según targetDate.docx
function calculateDates() {
    const now = new Date();
    let targetDate = new Date(now);
    if (now.getHours() > 23) targetDate.setDate(targetDate.getDate() + 1);
    
    const timeEnd = new Date(targetDate);
    timeEnd.setDate(targetDate.getDate() - 1);
    
    const timeStart = new Date(timeEnd);
    timeStart.setDate(timeEnd.getDate() - 3);

    return { targetDate, timeEnd, timeStart };
}

// Llamar a Kunna según fetch.docx
async function fetchKunna(timeStart, timeEnd) {
    const body = {
        time_start: timeStart.toISOString(),
        time_end: timeEnd.toISOString(),
        filters: [{ filter: "name", values: ["1d"] }, { filter: "alias", values: [ALIAS] }],
        limit: 100, count: false, order: "DESC"
    };

    const response = await fetch(KUNNA_URL, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`Error Kunna: ${response.status}`);
    const json = await response.json();
    return json.result; 
}

// Función principal
async function executeAcquisition() {
    const { targetDate, timeEnd, timeStart } = calculateDates();
    const kunnaResult = await fetchKunna(timeStart, timeEnd);

    if (!kunnaResult?.values || kunnaResult.values.length < 3) throw new Error("Datos insuficientes en Kunna");

    const rawValues = kunnaResult.values.slice(0, 3).map(row => row[2]);
    const timestamps = kunnaResult.values.slice(0, 3).map(row => row[0]);

    const features = [
        ...rawValues, targetDate.getHours(), targetDate.getDay(), targetDate.getMonth() + 1, targetDate.getDate()
    ];

    const newData = new AcquiredData({
        features, targetDate, dailyValues: rawValues,
        kunnaMeta: { alias: ALIAS, name: "1d", daysUsed: timestamps },
        fetchMeta: { timeStart, timeEnd }
    });

    return await newData.save();
}

// --- 3. SERVIDOR EXPRESS (CONTROLLER + ROUTES) ---
const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: "ok", service: "acquire" }));

app.post('/data', async (req, res) => {
    try {
        const savedData = await executeAcquisition();
        res.status(201).json({
            dataId: savedData._id,
            features: savedData.features,
            featureCount: savedData.features.length,
            scalerVersion: savedData.scalerVersion,
            createdAt: savedData.createdAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Arrancar
mongoose.connect(MONGO_URI)
  .then(() => {
      console.log('[ACQUIRE] Conectado a BD');
      app.listen(PORT, () => console.log(`[ACQUIRE] Escuchando en http://localhost:${PORT}`));
  })
  .catch(err => console.error('[ACQUIRE] Error Mongo:', err));