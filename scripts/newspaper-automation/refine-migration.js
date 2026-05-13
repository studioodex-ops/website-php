const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function refineMigration() {
    console.log("🚀 Refining News vs Grocery migration...");
    const productsRef = db.collection('products');
    const snapshot = await db.collection('products').where('category', '==', 'Grocery & Daily Needs').get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const name = (data.name || "").toLowerCase();
        
        // Items that look like news headlines (long names, news-like words)
        // or specifically the ones that were wrongly moved
        if (name.length > 50 || name.includes('prices rise') || name.includes(' investors ') || name.includes(' tanker ') || name.includes('ටොම්')) {
            console.log(`Reverting [${data.name}] -> Newspapers & Magazines`);
            batch.update(doc.ref, { 
                category: "Newspapers & Magazines",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Reverted ${count} news items.`);
    } else {
        console.log("No refinements needed.");
    }
    process.exit(0);
}

refineMigration().catch(console.error);
