const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCategories() {
    console.log("Fetching unique categories...");
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();
    
    const cats = {};
    snapshot.forEach(doc => {
        const cat = doc.data().category || "NO CATEGORY";
        cats[cat] = (cats[cat] || 0) + 1;
    });
    
    console.log("Unique Categories and Counts:");
    console.log(JSON.stringify(cats, null, 2));
    process.exit(0);
}

checkCategories().catch(console.error);
