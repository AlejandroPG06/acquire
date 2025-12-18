'use strict';
const AcquiredData = require('../models/acquireData');

const KUNNA_URL = "https://openapi.kunna.es/data/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NjM2NDEwNjB9.ixb4O5Jgk-e_oPMSsycpD7A_iGVqIl4Ijl2a_kLrT94";
const ALIAS = "6339651";

// 1. Calcular Fechas
function calculateDates() {
    const now = new Date();
    let targetDate = new Date(now);
    
    // Si ya es muy tarde, apuntamos a mañana
    if (now.getHours() > 23) {
        targetDate.setDate(targetDate.getDate() + 1);
    }
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

// --- NUEVA FUNCIÓN DE TU COMPAÑERO ---
function prepareFeatures(kunnaValues, targetDate) {
    if (!kunnaValues || kunnaValues.length < 3) throw new Error("Datos insuficientes de Kunna");

    // Limpieza explícita de datos (parseFloat asegura que es número)
    const v_t1 = parseFloat(kunnaValues[0][2]);
    const v_t2 = parseFloat(kunnaValues[1][2]);
    const v_t3 = parseFloat(kunnaValues[2][2]);

    const features = [
        v_t1,
        v_t2,
        v_t3,
        12, // Hora fija (Truco para estabilizar la IA)
        targetDate.getDay(),
        targetDate.getMonth() + 1,
        targetDate.getDate(),
    ];

    return features;
}

// 4. Función Principal
async function executeAcquisition() {
    const { targetDate, timeEnd, timeStart } = calculateDates();
    const kunnaResult = await fetchKunna(timeStart, timeEnd);

    // Usamos la función de limpieza
    const features = prepareFeatures(kunnaResult.values, targetDate);

    // Extraemos info para guardar en BD (metadatos)
    const dailyValues = [features[0], features[1], features[2]]; // Los 3 primeros son los consumos
    const timestamps = kunnaResult.values.slice(0, 3).map(row => row[0]);

    // Guardamos en Mongo
    const newData = new AcquiredData({
        features: features,
        targetDate: targetDate,
        dailyValues: dailyValues, 
        kunnaMeta: {
            alias: ALIAS,
            name: "1d",
            daysUsed: timestamps
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