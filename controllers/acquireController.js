'use strict';
const express = require('express');
const router = express.Router(); // Creamos el router aquí
const kunnaService = require('../services/kunnaService');

// --- FUNCIONES CONTROLADOR ---

function health(req, res) {
    res.json({ status: "ok", service: "acquire" });
}

async function getData(req, res) {
    try {
        const savedData = await kunnaService.executeAcquisition();
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
}

// --- DEFINICIÓN DE RUTAS ---
router.get('/health', health);
router.post('/data', getData);

// Exportamos el router ya configurado
module.exports = router;