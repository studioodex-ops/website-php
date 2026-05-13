const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const CATS = {
    STATIONERY: "Stationery & Office Supplies",
    NEWS: "Newspapers & Magazines"
};

async function finalCleanup() {
    console.log("🚀 Running Final Migration Refinement...");
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const name = (data.name || "").toLowerCase();
        let changed = false;
        let update = {};

        // 1. Fix Atlas items that moved to Writing but belong in Art/Craft
        if (data.category === CATS.STATIONERY && data.subcategory === "Writing Instruments") {
            if (name.includes('pastel') || name.includes('colour') || name.includes('scissor') || name.includes('paint') || name.includes('glue') || name.includes('clay')) {
                update.subcategory = "Art & Craft Supplies";
                changed = true;
            }
        }

        // 2. Fix News items that moved to Stationery or Grocery
        if (name.length > 50 || name.includes('පුවත්පත්') || name.includes(' oil prices ') || name.includes('විවෘත කර')) {
            if (data.category !== CATS.NEWS) {
                update.category = CATS.NEWS;
                update.subcategory = "Daily Newspapers";
                changed = true;
            }
        }

        if (changed) {
            console.log(`Final Fix [${data.name}]: ${data.category} -> ${update.category || data.category} | ${update.subcategory || data.subcategory}`);
            batch.update(doc.ref, update);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Refined ${count} items.`);
    } else {
        console.log("No refinements needed.");
    }
    process.exit(0);
}

finalCleanup().catch(console.error);
