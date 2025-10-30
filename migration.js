const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Initialize Firebase Admin SDK
// Load configuration from config.json
const config = require('./config.json');
const serviceAccount = config.firebase;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createDefaultUser() {
    try {
        // Check if user already exists
        const usersRef = db.collection('users');
        const q = usersRef.where('username', '==', 'admin');
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            console.log('Default user already exists');
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Create the user document in Firestore
        const userData = {
            name: 'Admin',
            lastName: 'User',
            username: 'admin',
            email: 'admin@example.com',
            password: hashedPassword,
        };

        const docRef = await db.collection('users').add(userData);

        console.log('Successfully created default user with ID:', docRef.id);

    } catch (error) {
        console.error('Error creating default user:', error);
    }
}

async function createInitialSprints() {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Monday

    const sprints = [];

    // Past sprints (last 4 weeks)
    for (let i = 4; i > 0; i--) {
        const start = new Date(currentWeekStart);
        start.setDate(start.getDate() - i * 14);
        const end = new Date(start);
        end.setDate(end.getDate() + 13);

        sprints.push({
            id: `sprint-${i}-past`,
            name: `Sprint ${i} (Past)`,
            startDate: admin.firestore.Timestamp.fromDate(start),
            endDate: admin.firestore.Timestamp.fromDate(end),
            items: [],
        });
    }

    // Current sprint
    const currentStart = new Date(currentWeekStart);
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 13);

    sprints.push({
        id: 'current-sprint',
        name: 'Current Sprint',
        startDate: admin.firestore.Timestamp.fromDate(currentStart),
        endDate: admin.firestore.Timestamp.fromDate(currentEnd),
        items: [],
    });

    // Future sprints (next 4)
    for (let i = 1; i <= 4; i++) {
        const start = new Date(currentWeekStart);
        start.setDate(start.getDate() + i * 14);
        const end = new Date(start);
        end.setDate(end.getDate() + 13);

        sprints.push({
            id: `sprint-${i}-future`,
            name: `Sprint ${i} (Future)`,
            startDate: admin.firestore.Timestamp.fromDate(start),
            endDate: admin.firestore.Timestamp.fromDate(end),
            items: [],
        });
    }

    // Save sprints to Firestore
    const batch = db.batch();
    sprints.forEach(sprint => {
        const docRef = db.collection('sprints').doc(sprint.id);
        batch.set(docRef, sprint);
    });

    await batch.commit();
    console.log('Initial sprints created');
}

async function runMigrations() {
    console.log('Running migrations...');

    try {
        await createDefaultUser();
    } catch (error) {
        console.error('Failed to create default user, but continuing with sprints...');
    }

    try {
        await createInitialSprints();
    } catch (error) {
        console.error('Failed to create initial sprints:', error);
    }

    console.log('Migrations completed!');
    process.exit(0);
}

runMigrations().catch(console.error);
