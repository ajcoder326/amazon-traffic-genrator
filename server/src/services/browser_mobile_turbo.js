/**
 * Mobile TURBO Mode - Multiple parallel browsers with USB Tethering
 * 
 * Uses 1 Android phone with USB tethering for multiple parallel browser instances
 * All browsers share same mobile IP, but process URLs 15x faster
 * 
 * Features:
 * - 3-5 browser instances
 * - 3-5 tabs per browser
 * - All traffic through mobile IP
 * - IP rotation after N visits
 */

const { firefox, chromium, webkit } = require('playwright');
const Tesseract = require('tesseract.js');
const mobileIPRotator = require('./mobileIPRotator');

class BrowserMobileTurboService {
    constructor() {
        this.browsers = [];
        this.contexts = [];
        this.browserCount = 3;
        this.tabCount = 5;
        this.visitCount = 0;
        this.rotateEvery = 10;
        this.currentIP = null;
        this.isConnected = false;
    }

    /**
     * Initialize multiple browsers
     */
    async initBrowsers(headless = true) {
        if (this.browsers.length > 0) return;

        // Check phone connection first
        console.log('[Mobile TURBO] Checking phone connection...');
        const connected = await mobileIPRotator.checkConnection();
        
        if (!connected) {
            console.log('[Mobile TURBO] ⚠ Phone not connected. Will use current network.');
            this.isConnected = false;
        } else {
            const deviceInfo = await mobileIPRotator.getDeviceInfo();
            console.log(`[Mobile TURBO] ✓ Using ${deviceInfo.model} (${deviceInfo.carrier})`);
            console.log(`[Mobile TURBO] Current IP: ${deviceInfo.currentIP}`);
            this.currentIP = deviceInfo.currentIP;
            this.isConnected = true;
        }

        const browserEngines = [firefox, chromium, webkit];
        const totalParallel = this.browserCount * this.tabCount;
        
        console.log(`[Mobile TURBO] 🚀 Launching ${this.browserCount} browsers × ${this.tabCount} tabs = ${totalParallel} parallel visits!`);

        for (let i = 0; i < this.browserCount; i++) {
            const engine = browserEngines[i % 3];
            const engineName = ['Firefox', 'Chrome', 'WebKit'][i % 3];
            
            console.log(`[Mobile TURBO] Launching Browser ${i + 1}/${this.browserCount} (${engineName})...`);
            
            const browser = await engine.launch({
                headless: headless,
            });

            this.browsers.push(browser);

            // Create contexts (tabs) for each browser
            const browserContexts = [];
            for (let j = 0; j < this.tabCount; j++) {
                const context = await browser.newContext({
                    viewport: {
                        width: 1366 + Math.floor(Math.random() * 100),
                        height: 768 + Math.floor(Math.random() * 50)
                    },
                    userAgent: this.getRandomUserAgent(),
                    locale: 'en-IN',
                    timezoneId: 'Asia/Kolkata'
                });
                browserContexts.push(context);
            }
            this.contexts.push(browserContexts);
        }

        console.log(`[Mobile TURBO] ✓ All browsers launched! Ready for ${totalParallel} parallel visits.`);
    }

    /**
     * Close all browsers
     */
    async closeBrowsers() {
        console.log('[Mobile TURBO] Closing all browsers...');
        
        for (const browser of this.browsers) {
            try {
                await browser.close();
            } catch (e) {
                // Ignore
            }
        }
        
        this.browsers = [];
        this.contexts = [];
        console.log('[Mobile TURBO] All browsers closed.');
    }

    /**
     * Run visit on a specific browser/tab
     */
    async runVisit(url, browserIndex, tabIndex) {
        if (!this.browsers[browserIndex] || !this.contexts[browserIndex][tabIndex]) {
            return { success: false, error: "Browser/Tab not initialized" };
        }

        const context = this.contexts[browserIndex][tabIndex];
        let page = null;

        try {
            // Check if we need to rotate IP
            this.visitCount++;
            if (this.visitCount > 1 && this.visitCount % this.rotateEvery === 0 && this.isConnected) {
                console.log(`[Mobile TURBO] Visited ${this.visitCount} pages, rotating IP...`);
                const rotation = await mobileIPRotator.rotateIP();
                if (rotation.success) {
                    this.currentIP = rotation.newIP;
                    console.log(`[Mobile TURBO] New IP: ${this.currentIP}`);
                }
            }

            page = await context.newPage();

            const engineName = ['Firefox', 'Chrome', 'WebKit'][browserIndex % 3];
            console.log(`[Mobile TURBO] [${engineName}-Tab${tabIndex + 1}] Visiting ${url} (Visit #${this.visitCount}, IP: ${this.currentIP || 'checking...'})...`);
            
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // --- INTERVENTION HANDLING ---
            await this.handleInterventions(page);
            await this.checkAndSolveCaptcha(page);
            await this.handleInterventions(page);

            // --- Interaction Logic ---
            await this.smoothScroll(page);
            await this.hoverImage(page);
            await this.clickBuyNow(page);

            await page.waitForTimeout(2000);

            return { success: true };

        } catch (error) {
            console.error(`[Mobile TURBO] Error visiting ${url}:`, error.message);
            return { success: false, error: error.message };
        } finally {
            if (page) await page.close().catch(() => { });
        }
    }

    /**
     * Get next available browser/tab in round-robin fashion
     */
    getNextSlot() {
        const totalSlots = this.browserCount * this.tabCount;
        const slotIndex = this.visitCount % totalSlots;
        const browserIndex = Math.floor(slotIndex / this.tabCount);
        const tabIndex = slotIndex % this.tabCount;
        
        return { browserIndex, tabIndex };
    }

    // --- Interaction Methods ---

    async handleInterventions(page) {
        try {
            const buttonFound = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a.a-button-text, input[type="submit"]'));
                const target = buttons.find(b =>
                    b.innerText?.toLowerCase().includes('continue shopping') ||
                    b.value?.toLowerCase().includes('continue shopping')
                );
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            });

            if (buttonFound) {
                console.log("[Mobile TURBO] 'Continue Shopping' intervention handled.");
                await page.waitForLoadState('domcontentloaded').catch(() => { });
            }
        } catch (e) {
            // Ignore
        }
    }

    async checkAndSolveCaptcha(page) {
        try {
            const captchaImgSelector = 'form[action="/errors/validateCaptcha"] img';
            const captchaInputSelector = '#captchacharacters';
            const captchaSubmitSelector = 'button[type="submit"]';

            const imgElement = await page.$(captchaImgSelector);
            if (imgElement) {
                console.log("[Mobile TURBO] CAPTCHA detected! Attempting to solve...");

                const screenshotBuffer = await imgElement.screenshot();
                const { data: { text } } = await Tesseract.recognize(screenshotBuffer, 'eng');
                const solution = text.replace(/[^a-zA-Z]/g, '').toUpperCase().trim();

                console.log(`[Mobile TURBO] Captcha solution guess: ${solution}`);

                if (solution.length > 0) {
                    await page.fill(captchaInputSelector, solution);
                    await Promise.all([
                        page.waitForNavigation({ timeout: 10000 }).catch(() => { }),
                        page.click(captchaSubmitSelector)
                    ]);
                    console.log("[Mobile TURBO] Captcha submitted.");
                }
            }
        } catch (e) {
            console.error("[Mobile TURBO] Captcha solving error:", e.message);
        }
    }

    async smoothScroll(page) {
        try {
            await page.evaluate(async () => {
                const distance = document.body.scrollHeight * 0.7;
                window.scrollTo({ top: distance, behavior: 'smooth' });
                await new Promise(r => setTimeout(r, 3000));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            await page.waitForTimeout(1000);
        } catch (e) {
            // Ignore
        }
    }

    async hoverImage(page) {
        try {
            const imageSelector = '#landingImage, #imgTagWrapperId img, .a-dynamic-image';
            const image = await page.$(imageSelector);
            if (image) {
                await image.hover();
                await page.waitForTimeout(1000);
            }
        } catch (e) {
            // Ignore
        }
    }

    async clickBuyNow(page) {
        try {
            const buySelector = '#buy-now-button, input[name="submit.buy-now"], #buyNow';
            const button = await page.$(buySelector);
            if (button) {
                await button.click();
                await page.waitForLoadState('networkidle').catch(() => { });
            }
        } catch (e) {
            // Ignore
        }
    }

    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    // Configuration methods
    setBrowserCount(count) {
        this.browserCount = Math.min(Math.max(count, 1), 5); // 1-5 browsers
        console.log(`[Mobile TURBO] Browser count set to ${this.browserCount}`);
    }

    setTabCount(count) {
        this.tabCount = Math.min(Math.max(count, 1), 5); // 1-5 tabs per browser
        console.log(`[Mobile TURBO] Tab count set to ${this.tabCount} per browser`);
    }

    setRotateEvery(count) {
        this.rotateEvery = count;
        console.log(`[Mobile TURBO] Will rotate IP every ${count} visits`);
    }

    // Get status for UI
    getStatus() {
        const rotatorStatus = mobileIPRotator.getStatus();
        return {
            connected: this.isConnected && rotatorStatus.connected,
            deviceId: rotatorStatus.deviceId,
            currentIP: this.currentIP,
            visitCount: this.visitCount,
            rotateEvery: this.rotateEvery,
            rotationCount: rotatorStatus.rotationCount,
            browserCount: this.browserCount,
            tabCount: this.tabCount,
            totalParallel: this.browserCount * this.tabCount
        };
    }

    // Force IP rotation
    async forceRotateIP() {
        if (this.isConnected) {
            return await mobileIPRotator.rotateIP();
        }
        return { success: false, error: 'Phone not connected' };
    }
}

module.exports = new BrowserMobileTurboService();
