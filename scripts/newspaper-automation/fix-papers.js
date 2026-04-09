const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');

// Initialize Firebase
const serviceAccount = JSON.parse(readFileSync('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json', 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function renamePastPapers() {
    console.log("Looking for 'Suhada' past papers...");
    try {
        const snapshot = await db.collection('products')
            .where('category', '==', 'Stationery')
            .get();

        let count = 0;
        let updateCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            let renamed = false;
            let updateData = {};

            if (data.name && data.name.includes('Suhada')) {
                updateData.name = data.name.replace(/Suhada/g, 'Sathara');
                renamed = true;
            }

            if (data.nameSi && data.nameSi.includes('සුහද')) {
                updateData.nameSi = data.nameSi.replace(/සුහද/g, 'සතර');
                renamed = true;
            }

            if (data.subcategory && data.subcategory.includes('Suhada')) {
                updateData.subcategory = data.subcategory.replace(/Suhada/g, 'Sathara')
                                                         .replace(/Books/g, 'Publications');
                renamed = true;
            }

            if (renamed) {
                await db.collection('products').doc(doc.id).update(updateData);
                updateCount++;
                console.log(`Updated: ${updateData.name || data.name}`);
            }
            count++;
        }

        console.log(`Checked ${count} products. Updated ${updateCount} products.`);
    } catch (error) {
        console.error("Error:", error);
    }
}

renamePastPapers();
