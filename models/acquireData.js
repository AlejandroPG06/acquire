'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AcquiredDataSchema = new Schema({
    features: { type: [Number], required: true },
    featureCount: { type: Number, default: 7 },
    scalerVersion: { type: String, default: "v1" },
    createdAt: { type: Date, default: Date.now },
    targetDate: { type: Date, required: true },
    
    dailyValues: { type: [Number], required: true }, // Para guardar los valores crudos
    
    kunnaMeta: {
        alias: { type: String, default: "6339651" },
        name: { type: String, default: "1d" },
        daysUsed: [String] // Aquí guardaremos las fechas de los datos usados
    },
    
    fetchMeta: {
        timeStart: Date,
        timeEnd: Date,
        source: { type: String, default: "acquire" }
    }
});

module.exports = mongoose.model('AcquiredData', AcquiredDataSchema);