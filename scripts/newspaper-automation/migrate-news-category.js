const admin = require('firebase-admin');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function migrate() {
    console.log("Starting migration: Moving automated items from 'Newspapers' to 'News'...");
    
    // Find automated items that are in 'Newspapers' category
    const snapshot = await db.collection('products')
        .where('automated', '==', true)
        .where('category', '==', 'Newspapers')
        .get();

    if (snapshot.empty) {
        console.log("No documents found for migration.");
        return;
    }

    console.log(`Found ${snapshot.size} documents to migrate.`);

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { category: 'News' });
    });

    await batch.commit();
    console.log("✅ Successfully migrated categories to 'News'!");
}

migrate().catch(console.error);
