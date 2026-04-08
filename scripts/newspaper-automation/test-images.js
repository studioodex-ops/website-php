const Parser = require('rss-parser');
const parser = new Parser({
    customFields: {
        item: [
            ['media:content', 'mediaContent'],
            ['content:encoded', 'contentEncoded'],
            ['description', 'description']
        ]
    }
});

const urls = [
    'https://divaina.lk/feed/',
    'https://www.dinamina.lk/feed/',
    'https://www.hirunews.lk/rss/sinhala.xml',
    'https://gossiplankanews.com/feeds/posts/default?alt=rss'
];

async function checkFeeds() {
    for (const url of urls) {
        console.log(`\n--- Fetching ${url} ---`);
        try {
            let feed = await parser.parseURL(url);
            let item = feed.items[0];
            if (!item) {
                console.log("No items found");
                continue;
            }
            console.log("Title:", item.title);
            console.log("Enclosure:", item.enclosure ? item.enclosure.url : "None");
            console.log("Has Content:", !!item.content);
            console.log("Has ContentEncoded:", !!item.contentEncoded);
            console.log("Has MediaContent:", !!item.mediaContent);
            console.log("Description:", (item.description || "").substring(0, 150));
            // try to find img tag in content or contentEncoded or description
            const searchAreas = [item.content, item.contentEncoded, item.description];
            let foundImage = false;
            for (let html of searchAreas) {
                if (html) {
                    const match = html.match(/<img[^>]+src="([^">]+)"/i);
                    if (match) {
                        console.log("Found image in HTML:", match[1]);
                        foundImage = true;
                        break;
                    }
                }
            }
            if (!foundImage) console.log("No image found in standard tags.");
        } catch (e) {
            console.log("Error:", e.message);
        }
    }
}
checkFeeds();
