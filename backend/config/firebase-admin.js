/**
 * Firebase Admin SDK Configuration
 * Server-side Firebase access (credentials hidden from clients)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables
const initializeFirebase = () => {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Handle newlines in private key
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
        console.log('[Firebase] Admin SDK initialized successfully');
    } catch (error) {
        console.error('[Firebase] Failed to initialize:', error.message);
        throw error;
    }

    return admin.app();
};

// Initialize on module load
initializeFirebase();

// Export Firestore database
const db = admin.firestore();

// Export Admin Auth
const auth = admin.auth();

module.exports = {
    admin,
    db,
    auth
};
