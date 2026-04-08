const https = require('https');
https.get('https://sinhala.adaderana.lk', res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const m = d.match(/href="([^"]+rss[^"]+)"/ig);
        console.log("Adaderana RSS:", m);
    });
});
https.get('https://sinhala.newsfirst.lk', res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const m = d.match(/href="([^"]+rss[^"]+)"/ig);
        console.log("Newsfirst RSS:", m);
        const feed = d.match(/href="([^"]+feed[^"]+)"/ig);
        console.log("Newsfirst Feed:", feed);
    });
});
