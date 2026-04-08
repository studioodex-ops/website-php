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

async function checkQuery() {
    try {
        const uniqueCats = ["Newspapers", "newspapers", "NEWSPAPERS", "Newspapers"];
        const productsRef = db.collection('products');

        // This is what the frontend does:
        // where("category", "in", uniqueCats)
        // where("subcategory", "==", "Daily Papers")  // the subagent clicked on 'Daily Papers'

        let q = productsRef.where("category", "in", uniqueCats);
        q = q.where("subcategory", "==", "Daily Papers");

        await q.get();
        console.log("Query success");
    } catch (e) {
        console.error("Query failed:", e.message);
    }
}
checkQuery();
