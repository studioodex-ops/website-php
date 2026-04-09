const admin = require('firebase-admin');
const fs = require('fs');
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';

if (!admin.apps.length) {
    let serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function fixMiscategorized() {
    console.log("Checking for news articles in 'Newspapers' category...");
    const snapshot = await db.collection('products')
        .where('category', 'in', ['Newspapers', 'newspapers'])
        .get();

    console.log(`Found ${snapshot.docs.length} candidate items.`);
    
    let updateCount = 0;
    for (const doc of snapshot.docs) {
        const d = doc.data();
        
        // Logical check: If it has 'link' or 'automated' flag, or subcategory is 'Daily News'
        const isNews = d.automated === true || 
                       d.link !== undefined || 
                       d.subcategory === 'Daily News' ||
                       ['Gossip Lanka', 'Dinamina', 'Divaina', 'Ada Derana'].includes(d.brand);

        if (isNews) {
            console.log(`Moving to News: ${d.name}`);
            await db.collection('products').doc(doc.id).update({
                category: 'News',
                subcategory: 'Latest News'
            });
            updateCount++;
        }
    }

    console.log(`Success: Moved ${updateCount} items to 'News' category.`);
    process.exit(0);
}

fixMiscategorized();
