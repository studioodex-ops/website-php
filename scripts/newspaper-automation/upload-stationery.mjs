import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase
const serviceAccount = JSON.parse(readFileSync('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json', 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const products = [];

// Helper to add products
function addProduct(name, nameSi, subcategory, gradeTag) {
    products.push({
        name,
        nameSi,
        category: "Stationery",
        subcategory,
        price: 0,
        cost: 0,
        stock: 0,
        sku: "B" + Math.floor(100000 + Math.random() * 900000),
        image: "assets/img/store.jpg" // Fallback
    });
}

// 1. Pre-school / English Starters (Master Guide)
const starters = [
    "First Step To English I",
    "First Step To English II",
    "My First Numbers I",
    "My First Numbers II",
    "Let's Write Numbers (Bilingual)",
    "රූප මගින් අකුරු ලියමු",
    "අපි ඉලක්කම් ලියමු 1",
    "අපි ඉලක්කම් ලියමු II"
];
starters.forEach(name => addProduct(`Master Guide - ${name}`, `මාස්ටර් ගයිඩ් - ${name}`, "Master Guide", "Grade 1"));

// Grades 1 to 5 Subjects
const primarySubjects = [
    { eng: "Sinhala", si: "සිංහල" },
    { eng: "Mathematics", si: "ගණිතය" },
    { eng: "Environment", si: "පරිසරය" },
    { eng: "Buddhism", si: "බුද්ධ ධර්මය" },
    { eng: "English", si: "English" },
    { eng: "Catholicism", si: "කතෝලික ධර්මය" },
    { eng: "Islam", si: "ඉස්ලාම් ධර්මය" }
];

for (let g = 1; g <= 5; g++) {
    primarySubjects.forEach(sub => {
        addProduct(`Master Guide Grade ${g} - ${sub.eng}`, `මාස්ටර් ගයිඩ් ${g} ශ්‍රේණිය - ${sub.si}`, "Master Guide", `Grade ${g}`);
    });
}

// Common Essays (Master Guide)
addProduct("Master Guide 2, 3 Essays", "මාස්ටර් ගයිඩ් 2, 3 ශ්‍රේණි රචනා", "Master Guide", "Grade 2");
addProduct("Master Guide 2, 3 Little Yellow Essay Book", "2, 3 Little Yellow Essay Book", "Master Guide", "Grade 2");
addProduct("Master Guide 3/4/5/6/7/8 Essays", "මාස්ටර් ගයිඩ් 3/4/5/6/7/8 රචනා", "Master Guide", "Grade 3");
addProduct("Master Guide 4/5/6 Little Green Essay Book", "4/5/6 Little Green Essay Book", "Master Guide", "Grade 4");

// Grades 6 to 11 Subjects
const secondarySubjects = [
    { eng: "Sinhala", si: "සිංහල" },
    { eng: "Mathematics I", si: "ගණිතය I" },
    { eng: "Mathematics II", si: "ගණිතය II" },
    { eng: "Science I", si: "විද්‍යාව I" },
    { eng: "Science II", si: "විද්‍යාව II" },
    { eng: "History", si: "ඉතිහාසය" },
    { eng: "Geography", si: "භූගෝල විද්‍යාව" },
    { eng: "Civics", si: "පුරවැසි අධ්‍යාපනය" },
    { eng: "Health", si: "සෞඛ්‍ය" },
    { eng: "Buddhism", si: "බුද්ධ ධර්මය" },
    { eng: "English Language", si: "English Language" },
    { eng: "Tamil", si: "දෙමළ" },
    { eng: "ICT", si: "තොරතුරු තාක්ෂණය" },
    { eng: "Art", si: "චිත්‍ර" },
    { eng: "Music", si: "සංගීතය" },
    { eng: "Dancing", si: "නැටුම්" },
    { eng: "Business Studies & Accounting", si: "ව්‍යාපාර හා ගිණුම්කරණ අධ්‍යයනය" },
    { eng: "Agriculture", si: "කෘෂිකර්මය" },
    { eng: "Communication & Media Studies", si: "සන්නිවේදනය හා මාධ්‍ය අධ්‍යයනය" }
];

for (let g = 6; g <= 11; g++) {
    let gradeTag = g <= 9 ?\`Grade \${g}\` : g === 10 ? 'Grade 10' : 'Grade 11 O Level';
    secondarySubjects.forEach(sub => {
        addProduct(`Master Guide Grade ${ g } - ${ sub.eng } `, `මාස්ටර් ගයිඩ් ${ g } ශ්‍රේණිය - ${ sub.si } `, "Master Guide", gradeTag);
    });
}

// English Medium Master Guide Extras
for (let g = 6; g <= 11; g++) {
    let gradeTag = g <= 9 ? \`Grade \${g}\` : g === 10 ? 'Grade 10' : 'Grade 11 O Level';
    addProduct(`Master Guide Grade ${ g } - Mathematics(English Medium)`, `මාස්ටර් ගයිඩ් ${ g } ශ්‍රේණිය - ගණිතය(English Medium)`, "Master Guide", gradeTag);
    addProduct(`Master Guide Grade ${ g } - Science(English Medium)`, `මාස්ටර් ගයිඩ් ${ g } ශ්‍රේණිය - විද්‍යාව(English Medium)`, "Master Guide", gradeTag);
}

// 2. Suhada Prakashana - Workbooks & Books
const suhadaWorkbooks = [
    "1 අකුරු හැඩ රූ (A5)",
    "1 අකුරු හුරුව (A5)",
    "1 අකුරු හුරුව I",
    "1 අකුරු හුරුව II",
    "1 අකුරු හුරුව III",
    "1 අකුරු හුරුව IV",
    "2 අකුරු හුරුව I",
    "2 අකුරු හුරුව II",
    "2 අකුරු හුරුව III",
    "3 අකුරු හුරුව I",
    "3 අකුරු හුරුව II",
    "My First Counting Book",
    "Alphabet Writing Practice",
    "Numbers Writing Practice",
    "My First Number Book",
    "Nursery Rhymes",
    "Look and learn English (1)",
    "Look and learn English (2)",
    "English Picture Dictionary",
    "(HK) Alphabet Activities",
    "(HK) Mazes Puzzle Book",
    "(HK) Numbers 1 to 10 WB",
    "(HK) Shapes Arts Colouring",
    "(HK) Shapes Activities",
    "(HK) Writing and Colouring"
];
suhadaWorkbooks.forEach(w => addProduct(`Suhada - ${ w } `, `සුහද - ${ w } `, "Suhada Books", "Workbooks"));

const suhadaStories = [
    "ටොම්", "ටිම් ටිම්", "ගාර්ෆීල්ඩ්", "සමනළයා", 
    "හා පැංචිව ගංවතුරට අහුවෙලා",
    "තාරකාවේ යාළුවෝ",
    "මීමැසි පැංචි",
    "The Dog and the Bone Story",
    "The Bear's Secret Story",
    "True Friends Story",
    "The Grasshopper and the Ant"
];
suhadaStories.forEach(s => addProduct(`Suhada Story - ${ s } `, `සුහද කතා - ${ s } `, "Suhada Books", "Story Books"));

// Suhada Past Papers Grade 1-5
for (let g = 1; g <= 5; g++) {
    addProduct(`Suhada Grade ${ g } Workbook`, `සුහද ${ g } වසර වැඩපොත`, "Suhada Books", `Grade ${ g } `);
    addProduct(`Suhada Grade ${ g } Mathematics`, `සුහද ${ g } වසර ගණිතය`, "Suhada Books", `Grade ${ g } `);
    addProduct(`Suhada Grade ${ g } Sinhala`, `සුහද ${ g } වසර සිංහල`, "Suhada Books", `Grade ${ g } `);
    addProduct(`Suhada Grade ${ g } Environment`, `සුහද ${ g } වසර පරිසරය`, "Suhada Books", `Grade ${ g } `);
    if (g === 5) {
      addProduct(`Suhada Grade 5 Scholarship Past Papers`, `සුහද 5 වසර ශිෂ්‍යත්ව පෙරහුරු ප්‍රශ්න`, "Suhada Books", `Grade 5`);
    }
}

// Suhada Past Papers O/L & A/L
const oLA_LPapers = [
    "සාමාන්‍ය පෙළ ගණිතය (O/L Maths)",
    "සාමාන්‍ය පෙළ විද්‍යාව (O/L Science)",
    "සාමාන්‍ය පෙළ සිංහල (O/L Sinhala)",
    "සාමාන්‍ය පෙළ ඉතිහාසය (O/L History)",
    "සාමාන්‍ය පෙළ බුද්ධ ධර්මය (O/L Buddhism)",
    "උසස් පෙළ රසායන විද්‍යාව (A/L Chemistry)",
    "උසස් පෙළ භෞතික විද්‍යාව (A/L Physics)",
    "උසස් පෙළ ජීව විද්‍යාව (A/L Biology)",
    "උසස් පෙළ සංයුක්ත ගණිතය (A/L Combined Maths)",
    "උසස් පෙළ කෘෂි විද්‍යාව (A/L Agri)"
];

oLA_LPapers.forEach(paper => addProduct(`Suhada Past Papers - ${ paper } `, `සුහද පසුගිය ප්‍රශ්න පත්‍ර - ${ paper } `, "Suhada Books", "Past Papers"));

console.log(`Prepared ${ products.length } products.Uploading to Firestore...`);

// Upload
async function upload() {
    let count = 0;
    const batchList = [];
    
    // Process sequentially but faster than 1 by 1 if we map
    for (const p of products) {
        try {
            p.createdAt = new Date().toISOString();
            p.updatedAt = p.createdAt;
            await db.collection('products').add(p);
            count++;
            if (count % 20 === 0) console.log(`Uploaded ${ count } products...`);
        } catch (e) {
            console.error("Error uploading", p.name, e);
        }
    }
    console.log(`Finished! Successfully uploaded ${ count } products.`);
    process.exit(0);
}

upload();
