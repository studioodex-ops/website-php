const admin = require('firebase-admin');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const Parser = require('rss-parser');
const fs = require('fs');

const parser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'contentEncoded'],
            ['description', 'description']
        ]
    }
});
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';

// Initialize Firebase Admin
if (!admin.apps.length) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        serviceAccount = require(SERVICE_ACCOUNT_PATH);
    } else {
        console.error("FATAL ERROR: No Firebase Service Account Key found.");
        process.exit(1);
    }
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Target Configurations

// 1. RSS Feeds for Fast Breaking News & Main Newspapers
// Most major news sites offer an RSS feed which is the easiest and most reliable way to get headings.
const RSS_TARGETS = [
    { name: "Gossip Lanka", url: "https://gossiplankanews.com/feeds/posts/default?alt=rss", category: "News", brand: "Gossip Lanka" },
    { name: "Dinamina", url: "https://www.dinamina.lk/feed/", category: "News", brand: "Dinamina" },
    { name: "Divaina", url: "https://divaina.lk/feed/", category: "News", brand: "Divaina" }
    // Ada Derana, NewsFirst, Daily Mirror were removed as their standard RSS feeds contain English news
];

// 2. Educational & Kids Sites (Requires Web Scraping)
// Since these sites might not have RSS, we scrape their HTML.
const EDU_TARGETS = [
    {
        name: "Mihira (Kids)",
        brand: "Mihira",
        url: "https://www.lakehouse.lk/mihira", // Example Lakehouse page for Mihira
        type: "cheerio"
    },
    {
        name: "Sathara Publications",
        brand: "Sathara",
        url: "https://satharabooks.lk/product-category/past-papers/", // Example Target
        type: "cheerio"
    }
];

// Reusable function to fetch RSS feeds
async function fetchRSS(target) {
    console.log(`Fetching RSS for ${target.name}...`);
    let items = [];
    try {
        let feed = await parser.parseURL(target.url);
        // Take top 5 news items to avoid spamming the database
        feed.items.slice(0, 5).forEach(item => {
            // Some feeds put images in content, some in enclosures. 
            // A basic fallback is used if no image is clearly defined.
            let imageUrl = item.enclosure ? item.enclosure.url : "https://via.placeholder.com/300?text=News";

            // Try to extract image from content, description, or contentEncoded if enclosure is missing
            if (imageUrl === "https://via.placeholder.com/300?text=News") {
                const searchAreas = [item.content, item.contentEncoded, item.description, item.contentSnippet];
                for (let html of searchAreas) {
                    if (html) {
                        const match = html.match(/<img[^>]+src="([^">]+)"/i);
                        if (match) {
                            imageUrl = match[1];
                            break;
                        }
                    }
                }
            }

            items.push({
                name: item.title,
                desc: (item.contentSnippet || item.content || "").substring(0, 200) + "...",
                price: 0,
                category: "Newspapers",
                subcategory: "Daily News",
                brand: target.brand,
                image: imageUrl,
                link: item.link, // Keep the original link so customers can read full news
                createdAt: new Date(item.pubDate || Date.now()).toISOString(),
                automated: true,
                docId: `news_${target.brand}_${Date.now()}_${Math.floor(Math.random() * 1000)}`.replace(/\s+/g, '').toLowerCase()
            });
        });
        console.log(`Successfully fetched ${items.length} news items from ${target.name}.`);
    } catch (e) {
        console.error(`Error fetching RSS for ${target.name}:`, e.message);
    }
    return items;
}

// Reusable function to fetch Educational Books via Cheerio 
// (Needs CSS selectors tuned to the specific website's current layout)
async function scrapeEducational(target) {
    console.log(`Scraping HTML for ${target.name}...`);
    let items = [];
    try {
        const { data } = await axios.get(target.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(data);

        if (target.brand === "Sathara") {
            // This is a hypothetical selector for WooCommerce/Sathara
            $('.product').slice(0, 5).each((i, el) => {
                const title = $(el).find('.woocommerce-loop-product__title').text().trim();
                const img = $(el).find('img').attr('src');
                const link = $(el).find('a').attr('href');

                if (title && img) {
                    items.push({
                        name: title,
                        desc: `Educational Material from ${target.brand}`,
                        price: 0,
                        category: "Newspapers",
                        subcategory: "Educational Papers",
                        brand: target.brand,
                        image: img,
                        link: link,
                        createdAt: new Date().toISOString(),
                        automated: true,
                        docId: `edu_${target.brand}_${Date.now()}_${i}`.replace(/\s+/g, '').toLowerCase()
                    });
                }
            });
        }
        console.log(`Successfully scraped ${items.length} items from ${target.name}.`);
    } catch (e) {
        console.error(`Error scraping ${target.name}:`, e.message);
    }
    return items;
}

// Main execution block
async function runAutomation() {
    console.log("=== Starting Multi-Source Newspaper Automation ===");
    let allUploads = [];

    // 1. Process RSS (News)
    for (const target of RSS_TARGETS) {
        const news = await fetchRSS(target);
        allUploads = allUploads.concat(news);
    }

    // 2. Process Educational HTML
    for (const target of EDU_TARGETS) {
        const edu = await scrapeEducational(target);
        allUploads = allUploads.concat(edu);
    }

    // Upload to Firebase
    if (allUploads.length > 0) {
        console.log(`\nPreparing to upload ${allUploads.length} total items to Firestore...`);
        const batch = db.batch();
        const productsRef = db.collection('products');

        allUploads.forEach(item => {
            // Extract docId to not save it in the document fields necessarily, or keep it.
            const docId = item.docId;
            delete item.docId; // Remove from the actual stored data if you want clean data

            const docRef = productsRef.doc(docId);
            batch.set(docRef, item, { merge: true });
        });

        // Update Morning Widget
        const latestNews = allUploads[0];
        const morningUpdateRef = db.collection('settings').doc('morning_update');
        batch.set(morningUpdateRef, {
            title: 'Morning Update',
            message: latestNews.name.substring(0, 45) + '...', // Shortened for UI
            status: 'new_arrival',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        try {
            await batch.commit();
            console.log("✅ Successfully uploaded to Firestore!");
        } catch (error) {
            console.error("❌ Error uploading to Firestore:", error);
        }
    } else {
        console.log("No new papers or news found to upload.");
    }

    console.log("=== Automation Cycle Complete ===");
}

runAutomation();
