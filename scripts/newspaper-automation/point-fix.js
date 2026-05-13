const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function pointFix() {
    console.log("🚀 Final Point Fix for Master Guide/Sathara...");
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const name = (data.name || "").toLowerCase();
        
        if (name.includes('master guide') || name.includes('sathara')) {
            if (data.category !== "Stationery & Office Supplies") {
                console.log(`Fixing [${data.name}] -> Stationery`);
                batch.update(doc.ref, { 
                    category: "Stationery & Office Supplies",
                    subcategory: "Exercise Books & CR Books"
                });
                count++;
            }
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Fixed ${count} items.`);
    }
    process.exit(0);
}

pointFix().catch(console.error);
