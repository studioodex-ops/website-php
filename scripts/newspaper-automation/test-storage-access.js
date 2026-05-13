const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'buddika-stores-web.firebasestorage.app'
});

async function checkBucket() {
    try {
        const bucket = admin.storage().bucket();
        console.log("Checking bucket:", bucket.name);
        const [files] = await bucket.getFiles({ maxResults: 1 });
        console.log("Successfully accessed bucket! Files found:", files.length);
    } catch (e) {
        console.error("Access Error:", e.message);
        if (e.code) console.error("Error Code:", e.code);
    }
}

checkBucket();
