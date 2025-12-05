'use strict';
const AcquiredData = require('../models/acquireData');

const KUNNA_URL = "https://openapi.kunna.es/data/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM2NDEwNjB9.ixb4O5Jgk-e_oPMSsycpD7A_iGVqIl4Ijl2a_kLrT94";
const ALIAS = "6339651";

// 1. Calcular Fechas
function calculateDates() {
    const now = new Date();
    let targetDate = new Date(now);
    
    if (now.getHours() > 23) {
        targetDate.setDate(targetDate.getDate() + 1);
    }
    // Normalizamos la hora para que quede limpio
    targetDate.setMinutes(0, 0, 0);

    const timeEnd = new Date(targetDate);
    timeEnd.setDate(targetDate.getDate() - 1);
    
    const timeStart = new Date(timeEnd);
    timeStart.setDate(timeEnd.getDate() - 3);

    return { targetDate, timeEnd, timeStart };
}

// 2. Pedir datos a Kunna
async function fetchKunna(timeStart, timeEnd) {
    const body = {
        time_start: timeStart.toISOString(),
        time_end: timeEnd.toISOString(),
        filters: [{ filter: "name", values: ["1d"] }, { filter: "alias", values: [ALIAS] }],
        limit: 100, count: false, order: "DESC"
    };

    try {
        const response = await fetch(KUNNA_URL, {
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(`Error Kunna: ${response.status}`);
        const json = await response.json();
        return json.result; 
    } catch (err) {
        throw new Error(`Fallo en fetchKunna: ${err.message}`);
    }
}

// 3. Función Principal (La que llama el controlador)
async function executeAcquisition() {
    const { targetDate, timeEnd, timeStart } = calculateDates();
    const kunnaResult = await fetchKunna(timeStart, timeEnd);

    if (!kunnaResult?.values || kunnaResult.values.length < 3) {
        throw new Error("Datos insuficientes recibidos de Kunna");
    }

    // --- AQUÍ ESTÁ LA CLAVE PARA QUE COINCIDA CON TU FOTO ---
    
    // row[2] es el VALOR (número)
    const rawValues = kunnaResult.values.slice(0, 3).map(row => row[2]); 
    // row[0] es la FECHA (string) -> Para daysUsed
    const timestamps = kunnaResult.values.slice(0, 3).map(row => row[0]);

    // Construimos el array de 7 features
    const features = [
        ...rawValues,
        targetDate.getHours(),
        targetDate.getDay(),
        targetDate.getMonth() + 1,
        targetDate.getDate()
    ];

    // Guardamos con la estructura EXACTA del modelo
    const newData = new AcquiredData({
        features: features,
        targetDate: targetDate,
        dailyValues: rawValues, // <--- Esto rellena el campo dailyValues
        kunnaMeta: {
            alias: ALIAS,
            name: "1d",
            daysUsed: timestamps // <--- Esto rellena las fechas usadas
        },
        fetchMeta: {
            timeStart: timeStart,
            timeEnd: timeEnd,
            source: "acquire"
        }
    });

    return await newData.save();
}

module.exports = { executeAcquisition };