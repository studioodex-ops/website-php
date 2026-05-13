const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setCors() {
    const buckets = ['buddika-stores-web.appspot.com', 'buddika-stores-web.firebasestorage.app'];
    
    for (const bucketName of buckets) {
        try {
            const bucket = admin.storage().bucket(bucketName);
            console.log("Setting CORS for bucket:", bucketName);
            const corsConfig = [
                {
                    origin: ['*'],
                    method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
                    responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
                    maxAgeSeconds: 3600
                }
            ];
            await bucket.setCorsConfiguration(corsConfig);
            console.log(`✅ CORS successfully fixed for ${bucketName}!`);
        } catch (e) {
            console.error(`CORS Error for ${bucketName}:`, e.message);
        }
    }
}

setCors();
