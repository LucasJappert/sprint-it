#!/usr/bin/env node

/**
 * Script para corregir las fechas del Sprint 78
 *
 * Corrige la fechaHasta del Sprint 78 para incluir el día 27/10/2025,
 * manteniendo consistencia con los sprints existentes.
 *
 * Uso: node scripts/correct-sprint-78-dates.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Load configuration from config.json
const config = require('../config.json');
const serviceAccount = config.firebase;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// CONFIGURACIÓN CORREGIDA DEL SPRINT 78
const correctedSprint78Config = {
    fechaHasta: new Date(2025, 9, 27), // 27 de octubre de 2025 (incluyendo el día)
};

async function correctSprint78Dates() {
    try {
        console.log('🚀 Iniciando corrección de fechas del Sprint 78...\n');

        // Verificar si el sprint existe
        const sprintRef = db.collection('sprints').doc('sprint-78');
        const sprintDoc = await sprintRef.get();

        if (!sprintDoc.exists) {
            console.log('❌ El Sprint 78 no existe. Primero ejecuta el script create-sprint-78.js');
            return;
        }

        const currentData = sprintDoc.data();
        console.log('📋 Sprint 78 encontrado:');
        console.log(`   Fecha Desde: ${currentData.fechaDesde.toDate().toLocaleDateString('es-ES')}`);
        console.log(`   Fecha Hasta (actual): ${currentData.fechaHasta.toDate().toLocaleDateString('es-ES')}`);
        console.log(`   Fecha Hasta (corregida): ${correctedSprint78Config.fechaHasta.toLocaleDateString('es-ES')}`);
        console.log('');

        // Actualizar solo la fechaHasta
        await sprintRef.update({
            fechaHasta: correctedSprint78Config.fechaHasta
        });

        console.log('✅ Fecha Hasta del Sprint 78 corregida exitosamente!');
        console.log('');
        console.log('🎉 Corrección completada.');
        console.log('📌 El Sprint 78 ahora va del 13/10/2025 al 27/10/2025.');

    } catch (error) {
        console.error('❌ Error durante la corrección del Sprint 78:', error);
        process.exit(1);
    }
}

// Ejecutar el script
correctSprint78Dates().then(() => {
    console.log('\n🏁 Script completado exitosamente!');
    process.exit(0);
}).catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
});
