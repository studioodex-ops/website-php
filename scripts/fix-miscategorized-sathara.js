
import { db, collection, getDocs, updateDoc, doc, query, where } from '../assets/js/firebase-config.js';

async function fixMiscategorizedSathara() {
    console.log("🚀 Starting Sathara Category Fix...");
    const productsRef = collection(db, "products");
    
    // We query for the category where they are currently stuck
    const q = query(productsRef, where("category", "==", "Grocery & Daily Needs"));
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} items in 'Grocery & Daily Needs' category.`);
    
    let fixCount = 0;
    for (const document of snapshot.docs) {
        const p = document.data();
        const name = (p.name || '').toLowerCase();
        
        // Check if it's a Sathara branded item
        if (name.includes('sathara')) {
            console.log(`📦 Fixing: ${p.name} -> Moving to School Stationery`);
            await updateDoc(doc(db, "products", document.id), {
                category: "School Stationery",
                updatedAt: new Date().toISOString()
            });
            fixCount++;
        }
    }
    
    console.log(`✅ Done! Fixed ${fixCount} items.`);
}

// Export for use in browser console if needed
window.fixMiscategorizedSathara = fixMiscategorizedSathara;

// To run this:
// 1. Open admin.html or products.html
// 2. Open Browser Console
// 3. Import this script or copy-paste it
// 4. Run: await fixMiscategorizedSathara()
