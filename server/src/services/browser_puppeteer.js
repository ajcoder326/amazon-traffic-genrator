const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const Tesseract = require('tesseract.js');
const fs = require('fs');

puppeteer.use(StealthPlugin());

class BrowserService {
    constructor() {
        // We no longer maintain a global browser for visits to ensure proxy support per-visit
        // But we keep the interface compatible
        this.globalBrowser = null;
    }

    async initBrowser(headless = true) {
        // Compatibility method - typically used for pre-warming or validation
        // In this robust version, we launch per-visit, so we just log.
        console.log(`[BrowserService] Ready (Headless mode: ${headless}). Visits will launch isolated instances for robustness.`);
        this.defaultHeadless = headless;
    }

    async closeBrowser() {
        // Compatibility method
        if (this.globalBrowser) {
            await this.globalBrowser.close();
            this.globalBrowser = null;
        }
    }

    async runVisit(url, proxyConfig) {
        let browser = null;
        let page = null;

        try {
            console.log(`[BrowserService] Starting visit to: ${url}`);

            // 1. Launch Options with Proxy
            const args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
                '--wm-window-animations-disabled',
            ];

            if (proxyConfig && proxyConfig.server) {
                // Remove http/https prefix for --proxy-server arg if present, though Puppeteer is flexible
                // proxyConfig.server comes as "http://ip:port" from proxyManager
                const proxyUrl = proxyConfig.server.replace(/^https?:\/\//, '');
                args.push(`--proxy-server=${proxyUrl}`);
                console.log(`[BrowserService] Using Proxy: ${proxyUrl}`);
            }

            // Launch Browser
            browser = await puppeteer.launch({
                headless: this.defaultHeadless ? "new" : false,
                args: args,
                defaultViewport: null,
                ignoreHTTPSErrors: true
            });

            const pages = await browser.pages();
            page = pages[0];

            // Auth for Proxy
            if (proxyConfig && proxyConfig.username && proxyConfig.password) {
                await page.authenticate({
                    username: proxyConfig.username,
                    password: proxyConfig.password
                });
            }

            // Viewport & UA
            await page.setViewport({ width: 1366 + Math.floor(Math.random() * 100), height: 768 + Math.floor(Math.random() * 100) });

            // Visit URL
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // --- INTERVENTION HANDLING ---
            await this.handleInterventions(page);
            await this.checkAndSolveCaptcha(page);

            // Double check in case captcha reload happened
            await this.handleInterventions(page);


            // --- CORE ACTIONS (Mirrored from Playwright) ---

            // 1. Smooth Scroll
            await this.smoothScroll(page);

            // 2. Hover Image
            await this.hoverImage(page);

            // 3. Click Buy Now
            await this.clickBuyNow(page);

            await new Promise(r => setTimeout(r, 2000));
            console.log(`[BrowserService] Visit successful: ${url}`);
            return { success: true };

        } catch (error) {
            console.error(`[BrowserService] Error visiting ${url}:`, error.message);
            // Capture screenshot on error for debugging (optional)
            // if (page) await page.screenshot({ path: `error_${Date.now()}.png` });
            return { success: false, error: error.message };
        } finally {
            if (browser) {
                await browser.close().catch(e => console.error("Error closing browser", e));
            }
        }
    }

    // --- LOGIC METHODS ---

    async handleInterventions(page) {
        try {
            // Check for "Continue shopping" button (Amazon soft-block)
            // Selector based on user image and common Amazon patterns
            const continueSelector = 'button:not([disabled]), .a-button-text'; // Broad, then filter

            // Specific check for the text
            const buttonFound = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a.a-button-text, input[type="submit"]'));
                const target = buttons.find(b =>
                    b.innerText.toLowerCase().includes('continue shopping') ||
                    b.value?.toLowerCase().includes('continue shopping')
                );
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            });

            if (buttonFound) {
                console.log("[BrowserService] 'Continue Shopping' intervention handled.");
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
            }
        } catch (e) {
            // console.log("Intervention check failed (non-fatal)", e.message);
        }
    }

    async checkAndSolveCaptcha(page) {
        try {
            // Amazon captcha selector
            const captchaImgSelector = 'form[action="/errors/validateCaptcha"] img';
            const captchaInputSelector = '#captchacharacters';
            const captchaSubmitSelector = 'button[type="submit"]';

            const imgElement = await page.$(captchaImgSelector);
            if (imgElement) {
                console.log("[BrowserService] CAPTCHA detected! Attempting to solve...");

                // Screenshot the captcha element
                const screenshotBuffer = await imgElement.screenshot();

                // Solve with Tesseract
                const { data: { text } } = await Tesseract.recognize(screenshotBuffer, 'eng');

                // Clean text (Amazon captchas are usually uppercase letters)
                const solution = text.replace(/[^a-zA-Z]/g, '').toUpperCase().trim();

                console.log(`[BrowserService] Captcha solution guess: ${solution}`);

                if (solution.length > 0) {
                    await page.type(captchaInputSelector, solution, { delay: 100 });
                    await Promise.all([
                        page.waitForNavigation({ timeout: 10000 }).catch(() => { }),
                        page.click(captchaSubmitSelector)
                    ]);
                    console.log("[BrowserService] Captcha submitted.");
                } else {
                    console.log("[BrowserService] Could not recognize characters.");
                }
            }
        } catch (e) {
            console.error("[BrowserService] Captcha solving error:", e.message);
        }
    }

    async smoothScroll(page) {
        try {
            await page.evaluate(async () => {
                const distance = document.body.scrollHeight * 0.7;
                const delay = 3000;
                const timer = setInterval(() => {
                    window.scrollBy(0, 50);
                    if (window.scrollY >= distance) clearInterval(timer);
                }, 50);
                await new Promise(r => setTimeout(r, delay));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) { }
    }

    async hoverImage(page) {
        try {
            const imageSelector = '#landingImage, #imgTagWrapperId img, .a-dynamic-image';
            await page.waitForSelector(imageSelector, { timeout: 5000 });
            await page.hover(imageSelector);
            await new Promise(r => setTimeout(r, 1500));
        } catch (e) { }
    }

    async clickBuyNow(page) {
        try {
            const buySelector = '#buy-now-button, input[name="submit.buy-now"], #buyNow';
            const button = await page.$(buySelector);
            if (button) {
                await button.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => { });
            }
        } catch (e) { }
    }
}

module.exports = new BrowserService();
