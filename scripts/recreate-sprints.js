#!/usr/bin/env node

/**
 * Script para recrear sprints
 *
 * Este script borra todos los sprints existentes y crea un nuevo sprint inicial
 * con el nombre "Sprint 79" comenzando el 27/10/2025.
 *
 * Uso: node scripts/recreate-sprints.js
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

// CONFIGURACIÓN DEL NUEVO SPRINT INICIAL
const initialSprintConfig = {
    id: 'sprint-79',
    titulo: 'Sprint 79',
    fechaDesde: new Date(2025, 9, 27), // 27 de octubre de 2025 (mes 9 porque enero es 0)
    fechaHasta: new Date(2025, 10, 10), // 2 semanas después: 10 de noviembre de 2025
    workingDays: [true, true, true, true, true, true, true, true, true, true], // All 10 days are working days
    items: []
};

async function recreateSprints() {
    try {
        console.log('🚀 Iniciando recreación de sprints...\n');

        // Obtener todos los sprints existentes
        const sprintsRef = db.collection('sprints');
        const sprintsSnapshot = await sprintsRef.get();

        if (!sprintsSnapshot.empty) {
            console.log(`📋 Encontrados ${sprintsSnapshot.size} sprints existentes. Procediendo a eliminarlos...`);

            // Borrar todos los sprints existentes
            const deletePromises = sprintsSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePromises);

            console.log('✅ Todos los sprints existentes han sido eliminados.\n');
        } else {
            console.log('📋 No se encontraron sprints existentes.\n');
        }

        // Crear el nuevo sprint inicial
        console.log('📝 Creando nuevo sprint inicial...');
        console.log(`   ID: ${initialSprintConfig.id}`);
        console.log(`   Título: ${initialSprintConfig.titulo}`);
        console.log(`   Fecha Desde: ${initialSprintConfig.fechaDesde.toLocaleDateString('es-ES')}`);
        console.log(`   Fecha Hasta: ${initialSprintConfig.fechaHasta.toLocaleDateString('es-ES')}`);
        console.log(`   Working Days: ${initialSprintConfig.workingDays.filter(d => d).length} of ${initialSprintConfig.workingDays.length}`);
        console.log('');

        await sprintsRef.doc(initialSprintConfig.id).set(initialSprintConfig);

        console.log('✅ Sprint inicial creado exitosamente!');
        console.log('');
        console.log('🎉 Recreación de sprints completada.');
        console.log('📌 El próximo sprint que crees manualmente desde la app será "Sprint 80".');

    } catch (error) {
        console.error('❌ Error durante la recreación de sprints:', error);
        process.exit(1);
    }
}

// Ejecutar el script
recreateSprints().then(() => {
    console.log('\n🏁 Script completado exitosamente!');
    process.exit(0);
}).catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
});
