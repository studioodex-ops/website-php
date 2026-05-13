const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const TARGET_CATS = {
    GROCERY: "Grocery & Daily Needs",
    HOUSEHOLD: "Household & Personal Care",
    STATIONERY: "Stationery & Office Supplies",
    NEWS: "Newspapers & Magazines",
    SERVICES: "Printing & Document Services",
    OFFERS: "Special Offers & Promotions"
};

// Keyword mapping for auto-correction
const RULES = [
    { cat: TARGET_CATS.HOUSEHOLD, keywords: ["soap", "shampoo", "toothpaste", "oral", "baby", "lotion", "cleaning", "detergent", "pears", "clogard", "සබන්", "ෂැම්පු", "දත්", "ළදරු", "harpic", "comfort", "signal", "rinso", "surf excel"] },
    { cat: TARGET_CATS.STATIONERY, keywords: ["book", "pen", "pencil", "file", "a4", "paper", "art", "mathematical", "marker", "envelope", "sathara", "drawing", "master guide", "පොත්", "පෑන", "පැන්සල්"] },
    { cat: TARGET_CATS.NEWS, keywords: ["daily", "weekend", "vijaya", "mihira", "newspaper", "පුවත්පත්", "පැත්තර", "news"] },
    { cat: TARGET_CATS.SERVICES, keywords: ["photocopy", "printout", "scanning", "binding", "laminating", "පොටෝකොපි", "ප්‍රින්ට්"] },
    { cat: TARGET_CATS.GROCERY, keywords: ["rice", "sugar", "salt", "flour", "oil", "milk", "tea", "coffee", "biscuit", "snack", "spice", "dhal", "හාල්", "සීනි", "ලුණු", "පිටි", "තේ", "කිරි", "බිස්කට්"] }
];

async function runFullMigration() {
    console.log("🚀 Starting Full Category Migration...");
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    console.log(`Analyzing ${snapshot.size} products...`);

    let updateCount = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        const currentCat = data.category || "";
        const name = (data.name || "").toLowerCase();
        let newCat = currentCat;

        // 1. Direct shorthand mapping
        const shorthand = currentCat.toLowerCase().trim();
        if (shorthand === "grocery" || shorthand === "groceries") newCat = TARGET_CATS.GROCERY;
        else if (shorthand === "stationery") newCat = TARGET_CATS.STATIONERY;
        else if (shorthand === "news") newCat = TARGET_CATS.NEWS;
        else if (shorthand === "household") newCat = TARGET_CATS.HOUSEHOLD;

        // 2. Keyword-based matching (overrides if shorthand didn't catch it or for missing cats)
        for (const rule of RULES) {
            if (rule.keywords.some(k => name.includes(k))) {
                newCat = rule.cat;
                break;
            }
        }

        // Apply if changed
        if (newCat !== currentCat) {
            console.log(`Updating [${data.name}] : "${currentCat}" -> "${newCat}"`);
            batch.update(doc.ref, { 
                category: newCat,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            updateCount++;
        }
    });

    if (updateCount > 0) {
        console.log(`Committing ${updateCount} updates...`);
        await batch.commit();
        console.log("✅ Migration complete!");
    } else {
        console.log("No changes needed.");
    }
    process.exit(0);
}

runFullMigration().catch(console.error);
