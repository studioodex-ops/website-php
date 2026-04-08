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

            if (data.name && data.name.startsWith('Suhada Past Papers')) {
                const newName = data.name.replace('Suhada Past Papers', 'Sathara Past Papers');
                const newNameSi = data.nameSi ? data.nameSi.replace('සුහද පසුගිය ප්‍රශ්න පත්‍ර', 'සතර පසුගිය ප්‍රශ්න පත්‍ර') : data.nameSi;

                await db.collection('products').doc(doc.id).update({
                    name: newName,
                    nameSi: newNameSi,
                    subcategory: 'Sathara Publications'
                });
                updateCount++;
                console.log(`Updated: ${newName}`);
            }

            if (data.name && data.name.includes('Suhada Grade 5 Scholarship Past Papers')) {
                const newName = 'Sathara Grade 5 Scholarship Past Papers';
                const newNameSi = 'සතර 5 වසර ශිෂ්‍යත්ව පෙරහුරු ප්‍රශ්න';

                await db.collection('products').doc(doc.id).update({
                    name: newName,
                    nameSi: newNameSi,
                    subcategory: 'Sathara Publications'
                });
                updateCount++;
                console.log(`Updated: ${newName}`);
            }
            count++;
        }

        console.log(`Checked ${count} products. Updated ${updateCount} products.`);
    } catch (error) {
        console.error("Error:", error);
    }
}

renamePastPapers();
