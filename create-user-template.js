const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Initialize Firebase Admin SDK
// You need to download the service account key from Firebase Console
// and place it in the project root as 'serviceAccountKey.json'
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// CONFIGURACIÓN DEL USUARIO A CREAR
// Modifica estos valores según necesites
const userConfig = {
    name: 'Nombre',
    lastName: 'Apellido',
    username: 'usuario', // Este debe ser único
    email: 'usuario@ejemplo.com',
    password: 'contraseña123' // Esta se encriptará automáticamente
};

async function createUser() {
    try {
        // Check if user already exists
        const usersRef = db.collection('users');
        const q = usersRef.where('username', '==', userConfig.username);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            console.log(`User ${userConfig.username} already exists`);
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userConfig.password, 10);

        // Create the user document in Firestore
        const userData = {
            name: userConfig.name,
            lastName: userConfig.lastName,
            username: userConfig.username,
            email: userConfig.email,
            password: hashedPassword,
        };

        const docRef = await db.collection('users').add(userData);

        console.log(`Successfully created user ${userConfig.name} ${userConfig.lastName} with ID:`, docRef.id);
        console.log('User data:', {
            ...userData,
            password: '[ENCRYPTED]'
        });

    } catch (error) {
        console.error('Error creating user:', error);
    }
}

createUser().then(() => {
    console.log('User creation completed!');
    process.exit(0);
}).catch(console.error);
