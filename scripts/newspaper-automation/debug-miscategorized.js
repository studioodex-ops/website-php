const admin = require('firebase-admin');
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';

if (!admin.apps.length) {
    let serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function debugData() {
    const snapshot = await db.collection('products')
        .where('category', 'in', ['Newspapers', 'newspapers'])
        .get();

    snapshot.docs.forEach(doc => {
        console.log("ID:", doc.id);
        console.log("DATA:", JSON.stringify(doc.data(), null, 2));
        console.log("---");
    });
    process.exit(0);
}

debugData();
