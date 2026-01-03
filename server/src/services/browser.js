const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

class BrowserService {
    async runVisit(url, proxyConfig) {
        let browser = null;
        try {
            const launchOptions = {
                headless: "new", // Headless mode
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
            };

            if (proxyConfig) {
                launchOptions.args.push(`--proxy-server=${proxyConfig.server}`);
            }

            browser = await puppeteer.launch(launchOptions);
            const page = await browser.newPage();

            if (proxyConfig && proxyConfig.username) {
                await page.authenticate({
                    username: proxyConfig.username,
                    password: proxyConfig.password
                });
            }

            // Set specific user agent or viewport if needed
            await page.setViewport({ width: 1366, height: 768 });

            console.log(`Visiting ${url}...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // --- Interaction Logic (Ported from content.js) ---

            // 1. Scroll to reviews
            await this.smoothScroll(page);

            // 2. Hover over image (Selectors from content.js)
            await this.hoverImage(page);

            // 3. Click Buy Now (Selectors from content.js)
            await this.clickBuyNow(page);

            await new Promise(r => setTimeout(r, 2000)); // Final wait

            return { success: true };

        } catch (error) {
            console.error(`Error visiting ${url}:`, error.message);
            return { success: false, error: error.message };
        } finally {
            if (browser) await browser.close();
        }
    }

    async smoothScroll(page) {
        try {
            await page.evaluate(async () => {
                const distance = document.body.scrollHeight * 0.7;
                const delay = 3000;
                window.scrollTo({ top: distance, behavior: 'smooth' });
                await new Promise(r => setTimeout(r, delay));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.log('Scroll failed', e.message);
        }
    }

    async hoverImage(page) {
        try {
            const imageSelector = '#landingImage, #imgTagWrapperId img, .a-dynamic-image';
            const image = await page.$(imageSelector);
            if (image) {
                await image.hover();
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (e) {
            console.log('Hover failed', e.message);
        }
    }

    async clickBuyNow(page) {
        try {
            const buySelector = '#buy-now-button, input[name="submit.buy-now"], #buyNow';
            const button = await page.$(buySelector);
            if (button) {
                await button.click();
                await page.waitForNavigation({ timeout: 5000 }).catch(() => { });
            }
        } catch (e) {
            console.log('Buy Now failed', e.message);
        }
    }
}

module.exports = new BrowserService();
