const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(readFileSync(path.join(__dirname, 'buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json'), 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function fixImages() {
    const snapshot = await db.collection('products').get();
    let count = 0;
    let batch = db.batch();
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.image === 'assets/img/store.jpg') {
            batch.update(doc.ref, { image: '' });
            count++;
            
            if (count % 400 === 0) {
                await batch.commit();
                batch = db.batch();
            }
        }
    }
    
    if (count % 400 !== 0) {
        await batch.commit();
    }
    
    console.log(`Updated ${count} products, removed default image assets/img/store.jpg.`);
}

fixImages().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
