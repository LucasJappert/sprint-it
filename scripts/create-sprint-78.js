#!/usr/bin/env node

/**
 * Script para crear el Sprint 78
 *
 * Este script crea el Sprint 78 como antecesor del Sprint 79,
 * con fechas que cubren las 2 semanas previas al rango del Sprint 79
 * (27/10/2025 al 10/11/2025).
 *
 * Sprint 78: 13/10/2025 al 26/10/2025
 *
 * Uso: node scripts/create-sprint-78.js
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

// CONFIGURACIÓN DEL SPRINT 78
const sprint78Config = {
    id: 'sprint-78',
    titulo: 'Sprint 78',
    fechaDesde: new Date(2025, 9, 13), // 13 de octubre de 2025 (mes 9 porque enero es 0)
    fechaHasta: new Date(2025, 9, 26), // 26 de octubre de 2025 (2 semanas después)
    workingDays: [true, true, true, true, true, true, true, true, true, true], // All 10 days are working days
    items: []
};

async function createSprint78() {
    try {
        console.log('🚀 Iniciando creación del Sprint 78...\n');

        // Verificar si el sprint ya existe
        const sprintRef = db.collection('sprints').doc(sprint78Config.id);
        const sprintDoc = await sprintRef.get();

        if (sprintDoc.exists) {
            console.log(`⚠️ El Sprint 78 ya existe. No se realizará ninguna acción.`);
            console.log(`   ID: ${sprintDoc.data().id}`);
            console.log(`   Título: ${sprintDoc.data().titulo}`);
            console.log(`   Fecha Desde: ${sprintDoc.data().fechaDesde.toDate().toLocaleDateString('es-ES')}`);
            console.log(`   Fecha Hasta: ${sprintDoc.data().fechaHasta.toDate().toLocaleDateString('es-ES')}`);
            return;
        }

        // Crear el Sprint 78
        console.log('📝 Creando Sprint 78...');
        console.log(`   ID: ${sprint78Config.id}`);
        console.log(`   Título: ${sprint78Config.titulo}`);
        console.log(`   Fecha Desde: ${sprint78Config.fechaDesde.toLocaleDateString('es-ES')}`);
        console.log(`   Fecha Hasta: ${sprint78Config.fechaHasta.toLocaleDateString('es-ES')}`);
        console.log(`   Working Days: ${sprint78Config.workingDays.filter(d => d).length} of ${sprint78Config.workingDays.length}`);
        console.log('');

        await sprintRef.set(sprint78Config);

        console.log('✅ Sprint 78 creado exitosamente!');
        console.log('');
        console.log('🎉 Creación del Sprint 78 completada.');
        console.log('📌 Ahora puedes crear el Sprint 79 manualmente desde la app o ejecutar el script recreate-sprints.js para resetear.');

    } catch (error) {
        console.error('❌ Error durante la creación del Sprint 78:', error);
        process.exit(1);
    }
}

// Ejecutar el script
createSprint78().then(() => {
    console.log('\n🏁 Script completado exitosamente!');
    process.exit(0);
}).catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
});
