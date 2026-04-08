const Parser = require('rss-parser');
const parser = new Parser();

const urls = [
    'http://sinhala.adaderana.lk/rss/',
    'http://sinhala.adaderana.lk/rss.php',
    'https://sinhala.newsfirst.lk/feed/',
    'https://www.lankadeepa.lk/rss/0',
    'https://www.dinamina.lk/feed/'
];

async function check(url) {
    try {
        let feed = await parser.parseURL(url);
        console.log("SUCCESS:", url, feed.items.length);
    } catch (e) {
        console.log("FAIL:", url, e.message);
    }
}
(async () => {
    for (const u of urls) await check(u);
})();
