const admin = require('firebase-admin');
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';

if (!admin.apps.length) {
    let serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkNews() {
    const snapshot = await db.collection('products').where('category', 'in', ['Newspapers', 'newspapers']).get();
    console.log(`Found ${snapshot.docs.length} items.`);
    snapshot.docs.forEach(doc => {
        const d = doc.data();
        console.log(`- ${d.name} (${d.brand})`);
    });
}
checkNews();
