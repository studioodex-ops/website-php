const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('FirebaseError: The query requires an index')) {
            console.log("\n--- FOUND INDEX ERROR ---");
            console.log(text);
            console.log("-------------------------\n");
        }
    });

    try {
        await page.goto('http://localhost:8080/products.html?category=Newspapers', { waitUntil: 'networkidle2' });
        console.log("Loaded products.html?category=Newspapers");
        await page.waitForTimeout(2000); // wait for firebase to fetch

        // click 'Daily Papers' subcategory just in case
        const subCats = await page.$$('.subcategory-btn');
        for (let btn of subCats) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('Daily Papers')) {
                await btn.click();
                await page.waitForTimeout(2000);
            }
        }
    } catch (e) {
        console.error("Error:", e);
    }

    await browser.close();
})();
