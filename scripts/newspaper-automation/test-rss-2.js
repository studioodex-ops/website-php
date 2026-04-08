const Parser = require('rss-parser');
const parser = new Parser();

const urls = [
    'https://divaina.lk/feed/',
    'https://www.silumina.lk/feed/',
    'http://www.ada.lk/rss/0',
    'https://www.gossiplankanews.com/feeds/posts/default?alt=rss'
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
