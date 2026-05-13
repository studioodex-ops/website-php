const admin = require('firebase-admin');
const serviceAccount = require('./buddika-stores-web-firebase-adminsdk-fbsvc-a022c28eed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setCors() {
    try {
        const bucket = admin.storage().bucket();
        const corsConfig = [
            {
                origin: ['*'],
                method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
                responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
                maxAgeSeconds: 3600
            }
        ];
        await bucket.setCorsConfiguration(corsConfig);
        console.log("✅ CORS successfully fixed for buddika-stores-web.appspot.com!");
    } catch (e) {
        console.error("CORS Error:", e);
    }
}

setCors();
