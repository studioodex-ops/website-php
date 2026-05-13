const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const NEW_CATEGORIES = {
    GROCERY: "Grocery & Daily Needs",
    HOUSEHOLD: "Household & Personal Care",
    STATIONERY: "Stationery & Office Supplies",
    NEWS: "Newspapers & Magazines",
    SERVICES: "Printing & Document Services",
    OFFERS: "Special Offers & Promotions"
};

const HOUSEHOLD_KEYWORDS = ["soap", "toothpaste", "oral", "baby", "lotion", "cleaning", "detergent", "pears", "clogard", "shampoo", "ෂැම්පු", "පිරිසිදුකාරක", "සබන්", "දත්", "ළදරු"];
const STATIONERY_KEYWORDS = ["book", "pen", "pencil", "file", "a4", "paper", "art", "mathematical", "marker", "envelope", "sathara", "drawing", "පොත්", "පෑන", "පැන්සල්"];
const NEWS_KEYWORDS = ["daily", "weekend", "vijaya", "mihira", "newspaper", "පුවත්පත්", "පැත්තර"];
const SERVICE_KEYWORDS = ["photocopy", "printout", "scanning", "binding", "laminating", "පොටෝකොපි", "ප්‍රින්ට්"];

async function migrateProducts() {
    console.log("Starting migration...");
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    if (snapshot.empty) {
        console.log("No products found.");
        return;
    }

    let count = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        const name = (data.name || "").toLowerCase();
        const currentCat = data.category || "";
        let newCat = currentCat;
        let newSub = data.subcategory || "";

        // Logic for Household & Personal Care (Priority)
        if (HOUSEHOLD_KEYWORDS.some(k => name.includes(k))) {
            newCat = NEW_CATEGORIES.HOUSEHOLD;
            if (name.includes("oral") || name.includes("toothpaste") || name.includes("දත්")) newSub = "Oral Care";
            else if (name.includes("baby") || name.includes("ළදරු") || name.includes("pears")) newSub = "Baby Care";
            else if (name.includes("cleaning") || name.includes("laundry") || name.includes("පිරිසිදුකාරක")) newSub = "Laundry & Cleaning";
            else newSub = "Bath & Body Care";
        } 
        // Logic for Stationery
        else if (currentCat === "Stationery" || STATIONERY_KEYWORDS.some(k => name.includes(k))) {
            newCat = NEW_CATEGORIES.STATIONERY;
            if (name.includes("book") || name.includes("පොත්")) newSub = "Exercise Books & CR Books";
            else if (name.includes("pen") || name.includes("pencil") || name.includes("පෑන")) newSub = "Writing Instruments";
            else if (name.includes("file")) newSub = "Files & Folders";
            else if (name.includes("art") || name.includes("paint")) newSub = "Art & Craft Supplies";
        }
        // Logic for Newspapers
        else if (currentCat === "Newspapers" || currentCat === "News" || NEWS_KEYWORDS.some(k => name.includes(k))) {
            newCat = NEW_CATEGORIES.NEWS;
            if (name.includes("weekend") || name.includes("සතිඅන්ත")) newSub = "Weekend Newspapers";
            else if (name.includes("vijaya") || name.includes("mihira") || name.includes("ළමා")) newSub = "Educational Publications";
            else newSub = "Daily Newspapers";
        }
        // Logic for Printing Services
        else if (SERVICE_KEYWORDS.some(k => name.includes(k))) {
            newCat = NEW_CATEGORIES.SERVICES;
            if (name.includes("photocopy") || name.includes("printout")) newSub = "Photocopy & Printouts";
            else if (name.includes("binding") || name.includes("laminating")) newSub = "Binding & Laminating";
        }
        // Default Grocery
        else if (currentCat === "Grocery") {
            newCat = NEW_CATEGORIES.GROCERY;
            if (name.includes("rice") || name.includes("flour") || name.includes("හාල්")) newSub = "Rice, Flour & Pulses";
            else if (name.includes("spice") || name.includes("salt") || name.includes("කුළුබඩු")) newSub = "Spices & Condiments";
            else if (name.includes("tea") || name.includes("coffee") || name.includes("drink")) newSub = "Tea, Coffee & Beverages";
            else if (name.includes("biscuit") || name.includes("snack")) newSub = "Snacks, Biscuits & Sweets";
            else if (name.includes("milk") || name.includes("dairy")) newSub = "Dairy Products";
        }

        // Apply changes
        if (newCat !== currentCat || newSub !== data.subcategory) {
            batch.update(doc.ref, { 
                category: newCat, 
                subcategory: newSub,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Successfully migrated ${count} products.`);
    } else {
        console.log("No products needed migration.");
    }
}

migrateProducts().catch(console.error);
