const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateCategoryConfig() {
    console.log("Updating categories_config document...");
    const config = {
        "Grocery & Daily Needs": ["Rice, Flour & Pulses", "Spices & Condiments", "Tea, Coffee & Beverages", "Snacks, Biscuits & Sweets", "Canned & Packaged Food", "Dairy Products"],
        "Household & Personal Care": ["Oral Care", "Bath & Body Care", "Baby Care", "Laundry & Cleaning"],
        "Stationery & Office Supplies": ["Exercise Books & CR Books", "Writing Instruments", "Paper & Envelopes", "Files & Folders", "Art & Craft Supplies", "Mathematical Instruments"],
        "Newspapers & Magazines": ["Daily Newspapers", "Weekend Newspapers", "Educational Publications"],
        "Printing & Document Services": ["Photocopy & Printouts", "Binding & Laminating"],
        "Special Offers & Promotions": ["Combo Deals", "Clearance & Discounts"]
    };

    try {
        await db.collection('settings').doc('categories_config').set({ data: config });
        console.log("Successfully updated settings/categories_config.");
    } catch (e) {
        console.error("Error updating config:", e);
    }
}

updateCategoryConfig().catch(console.error);
