const admin = require('firebase-admin');
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';

if (!admin.apps.length) {
    let serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function clearOldNews() {
    console.log("Fetching old news...");
    const snapshot = await db.collection('products')
        .where('category', 'in', ['Newspapers', 'newspapers'])
        .get();

    console.log(`Found ${snapshot.docs.length} old news items. Deleting...`);
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log("Deleted old news items successfully.");
}

clearOldNews();
