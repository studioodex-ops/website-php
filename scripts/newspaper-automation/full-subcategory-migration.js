const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Target Categories & Subcategories
const CATS = {
    GROCERY: "Grocery & Daily Needs",
    HOUSEHOLD: "Household & Personal Care",
    STATIONERY: "Stationery & Office Supplies",
    NEWS: "Newspapers & Magazines",
    SERVICES: "Printing & Document Services",
    OFFERS: "Special Offers & Promotions"
};

const MAPPING = [
    // --- GROCERY & DAILY NEEDS ---
    { cat: CATS.GROCERY, sub: "Rice, Flour & Pulses", keywords: ["rice", "flour", "හාල්", "පිටි", "dhal", "parippu", "sugar", "salt", "සීනි", "ලුණු", "mung", "soy", "gram"] },
    { cat: CATS.GROCERY, sub: "Dairy Products", keywords: ["milk", "cheese", "butter", "කිරි", "dairy", "yogurt", "curd", "kothmale", "raththi", "anchor", "highland"] },
    { cat: CATS.GROCERY, sub: "Spices & Condiments", keywords: ["spice", "pepper", "chili", "powder", "turmeric", "කුළුබඩු", "ගම්මිරිස්", "මිරිස්", "කහ", "තුනපහ"] },
    { cat: CATS.GROCERY, sub: "Tea, Coffee & Beverages", keywords: ["tea", "coffee", "drink", "nectar", "juice", "කෝපි", "තේ", "බීම", "nestomalt", "milo", "vivia"] },
    { cat: CATS.GROCERY, sub: "Snacks, Biscuits & Sweets", keywords: ["biscuit", "snack", "chocolate", "candy", "ටොෆි", "බිස්කට්", "munchee", "maliban", "tiptop", "snix"] },
    { cat: CATS.GROCERY, sub: "Canned & Packaged Food", keywords: ["canned", "tin", "pack", "soup", "noodles", "maggie", "prima", "pasta"] },

    // --- HOUSEHOLD & PERSONAL CARE ---
    { cat: CATS.HOUSEHOLD, sub: "Oral Care", keywords: ["toothpaste", "toothbrush", "oral", "signal", "clogard", "දත්", "mouthwash"] },
    { cat: CATS.HOUSEHOLD, sub: "Baby Care", keywords: ["baby", "pears", "diaper", "lotion", "ළදරු", "baby cheramy", "pampers"] },
    { cat: CATS.HOUSEHOLD, sub: "Laundry & Cleaning", keywords: ["detergent", "soap", "cleaning", "harpic", "rinso", "surf", "සබන්", "wash", "comfort", "sunlight"] },
    { cat: CATS.HOUSEHOLD, sub: "Bath & Body Care", keywords: ["shampoo", "body", "foam", "cream", "ෂැම්පු", "lifebuoy", "lux", "rexona", "dove"] },

    // --- STATIONERY & OFFICE SUPPLIES ---
    { cat: CATS.STATIONERY, sub: "Writing Instruments", keywords: ["pen", "pencil", "marker", "eraser", "sharpener", "පෑන", "පැන්සල්", "atlas", "natraj", "flair"] },
    { cat: CATS.STATIONERY, sub: "Exercise Books & CR Books", keywords: ["book", "පොත්", "cr book", "notebook", "sathara", "master guide", "වැඩපොත", "කතා", "grade"] },
    { cat: CATS.STATIONERY, sub: "Files & Folders", keywords: ["file", "folder", "binder", "clear file"] },
    { cat: CATS.STATIONERY, sub: "Mathematical Instruments", keywords: ["math", "calculator", "geometry", "ruler", "කවකටු", "compass"] },
    { cat: CATS.STATIONERY, sub: "Paper & Envelopes", keywords: ["a4", "paper", "envelope", "senti", "තැපැල්"] },
    { cat: CATS.STATIONERY, sub: "Art & Craft Supplies", keywords: ["art", "paint", "colour", "clay", "drawing", "චිත්‍ර", "පැස්ටල්"] },

    // --- NEWSPAPERS & MAGAZINES ---
    { cat: CATS.NEWS, sub: "Daily Newspapers", keywords: ["daily", "newspaper", "පුවත්පත්", "පැත්තර", "lankadeepa", "dinamina", "ceylon today"] },
    { cat: CATS.NEWS, sub: "Weekend Newspapers", keywords: ["weekend", "sunday", "සතිඅන්ත", "irida"] },
    { cat: CATS.NEWS, sub: "Educational Publications", keywords: ["vijaya", "mihira", "ළමා", "educational", "පහන"] },

    // --- PRINTING & DOCUMENT SERVICES ---
    { cat: CATS.SERVICES, sub: "Photocopy & Printouts", keywords: ["photocopy", "printout", "scanning", "xerox", "ප්‍රින්ට්"] },
    { cat: CATS.SERVICES, sub: "Binding & Laminating", keywords: ["binding", "laminating", "spiral"] },

    // --- SPECIAL OFFERS & PROMOTIONS ---
    { cat: CATS.OFFERS, sub: "Bundle Offers", keywords: ["bundle", "pack", "deal", "combo"] },
    { cat: CATS.OFFERS, sub: "Weekly Savings", keywords: ["savings", "discount", "offer", "off"] }
];

async function migrateSubcategories() {
    console.log("🚀 Starting Comprehensive Subcategory Migration...");
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    console.log(`Processing ${snapshot.size} products...`);

    let updateCount = 0;
    const batch = db.batch();

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const name = (data.name || "").toLowerCase();
        const currentCat = data.category || "";
        const currentSub = data.subcategory || "";

        let bestMatch = null;

        // Find the best matching rule
        for (const rule of MAPPING) {
            if (rule.keywords.some(k => name.includes(k))) {
                // If it matches a subcategory, take it
                bestMatch = rule;
                break; 
            }
        }

        if (bestMatch) {
            const nextCat = bestMatch.cat;
            const nextSub = bestMatch.sub;

            if (nextCat !== currentCat || nextSub !== currentSub) {
                console.log(`Updating [${data.name}] -> ${nextCat} | ${nextSub}`);
                batch.update(docSnap.ref, {
                    category: nextCat,
                    subcategory: nextSub,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updateCount++;
            }
        }
    });

    if (updateCount > 0) {
        console.log(`Committing ${updateCount} updates...`);
        await batch.commit();
        console.log("✅ Subcategory Migration complete!");
    } else {
        console.log("No items needed updates.");
    }
    process.exit(0);
}

migrateSubcategories().catch(console.error);
