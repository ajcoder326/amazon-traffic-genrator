/**
 * Browser Service with Mobile IP Rotation (USB Tethering + ADB)
 * 
 * Uses Android phone connected via USB for:
 * 1. Internet connection (USB Tethering)
 * 2. IP rotation (Airplane Mode toggle via ADB)
 */

const { firefox } = require('playwright');
const Tesseract = require('tesseract.js');
const mobileIPRotator = require('./mobileIPRotator');

class BrowserMobileService {
    constructor() {
        this.browser = null;
        this.visitCount = 0;
        this.rotateEvery = 10; // Rotate IP every X visits
        this.currentIP = null;
    }

    async initBrowser(headless = true) {
        if (this.browser) return;

        // Check phone connection first
        console.log('[Mobile] Checking phone connection...');
        const connected = await mobileIPRotator.checkConnection();
        
        if (!connected) {
            console.log('[Mobile] ⚠ Phone not connected. Will use current network.');
            console.log('[Mobile] For mobile IP rotation, connect phone with USB debugging.');
        } else {
            const deviceInfo = await mobileIPRotator.getDeviceInfo();
            console.log(`[Mobile] ✓ Using ${deviceInfo.model} (${deviceInfo.carrier})`);
            console.log(`[Mobile] Current IP: ${deviceInfo.currentIP}`);
            this.currentIP = deviceInfo.currentIP;
        }

        console.log(`[Mobile] Launching Browser (Headless: ${headless})...`);
        this.browser = await firefox.launch({
            headless: headless,
        });
        console.log('[Mobile] Browser Launched');
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('[Mobile] Browser Closed');
        }
    }

    async runVisit(url, proxyConfig = null) {
        // proxyConfig is ignored - we use USB tethering
        
        if (!this.browser) {
            return { success: false, error: "Browser not initialized" };
        }

        let context = null;
        let page = null;

        try {
            // Check if we need to rotate IP
            this.visitCount++;
            if (this.visitCount > 1 && this.visitCount % this.rotateEvery === 0) {
                console.log(`[Mobile] Visited ${this.visitCount} pages, rotating IP...`);
                const rotation = await mobileIPRotator.rotateIP();
                if (rotation.success) {
                    this.currentIP = rotation.newIP;
                }
            }

            const contextOptions = {
                viewport: { 
                    width: 1366 + Math.floor(Math.random() * 100), 
                    height: 768 + Math.floor(Math.random() * 50) 
                },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
                locale: 'en-US',
                timezoneId: 'Asia/Kolkata' // Indian timezone for amazon.in
            };

            context = await this.browser.newContext(contextOptions);
            page = await context.newPage();

            console.log(`[Mobile] Visiting ${url} (Visit #${this.visitCount}, IP: ${this.currentIP || 'checking...'})...`);
            
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
            console.error(`[Mobile] Error visiting ${url}:`, error.message);
            return { success: false, error: error.message };
        } finally {
            if (page) await page.close().catch(() => { });
            if (context) await context.close().catch(() => { });
        }
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
                console.log("[Mobile] 'Continue Shopping' intervention handled.");
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
                console.log("[Mobile] CAPTCHA detected! Attempting to solve...");

                const screenshotBuffer = await imgElement.screenshot();
                const { data: { text } } = await Tesseract.recognize(screenshotBuffer, 'eng');
                const solution = text.replace(/[^a-zA-Z]/g, '').toUpperCase().trim();

                console.log(`[Mobile] Captcha solution guess: ${solution}`);

                if (solution.length > 0) {
                    await page.fill(captchaInputSelector, solution);
                    await Promise.all([
                        page.waitForNavigation({ timeout: 10000 }).catch(() => { }),
                        page.click(captchaSubmitSelector)
                    ]);
                    console.log("[Mobile] Captcha submitted.");
                }
            }
        } catch (e) {
            console.error("[Mobile] Captcha solving error:", e.message);
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

    // Set rotation frequency
    setRotateEvery(count) {
        this.rotateEvery = count;
        console.log(`[Mobile] Will rotate IP every ${count} visits`);
    }

    // Get status for UI
    getStatus() {
        const rotatorStatus = mobileIPRotator.getStatus();
        return {
            connected: rotatorStatus.connected,
            deviceId: rotatorStatus.deviceId,
            currentIP: this.currentIP,
            visitCount: this.visitCount,
            rotateEvery: this.rotateEvery,
            rotationCount: rotatorStatus.rotationCount
        };
    }

    // Force IP rotation
    async forceRotateIP() {
        return await mobileIPRotator.rotateIP();
    }
}

module.exports = new BrowserMobileService();
