const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSubCats() {
    console.log("Fetching subcategory distribution...");
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();
    
    const distribution = {};
    snapshot.forEach(doc => {
        const data = doc.data();
        const cat = data.category || "NO CATEGORY";
        const sub = data.subcategory || "NO SUBCATEGORY";
        
        if (!distribution[cat]) distribution[cat] = {};
        distribution[cat][sub] = (distribution[cat][sub] || 0) + 1;
    });
    
    console.log(JSON.stringify(distribution, null, 2));
    process.exit(0);
}

checkSubCats().catch(console.error);
