const admin = require('firebase-admin');
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';

if (!admin.apps.length) {
    let serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function findSuhada() {
    console.log("Searching for 'Suhada' in all products...");
    const snapshot = await db.collection('products').get();

    let count = 0;
    snapshot.docs.forEach(doc => {
        const d = doc.data();
        const hasSuhada = (d.name && d.name.includes('Suhada')) || 
                        (d.nameSi && d.nameSi.includes('සුහද')) ||
                        (d.brand && d.brand.includes('Suhada')) ||
                        (d.category && d.category.includes('Suhada'));

        if (hasSuhada) {
            console.log(`- [${doc.id}] ${d.name} | ${d.category} | ${d.subcategory}`);
            count++;
        }
    });

    console.log(`\nFound ${count} items with 'Suhada' reference.`);
    process.exit(0);
}

findSuhada();
