/**
 * Browser Service with FREE Working Proxies
 * Fetches and uses free rotating proxies
 */

const { firefox, chromium } = require('playwright');
const Tesseract = require('tesseract.js');
const path = require('path');
const freeProxyFetcher = require('./freeProxyFetcher');

class BrowserFreeProxyService {
    constructor() {
        this.browser = null;
        this.context = null;
        this.visitCount = 0;
        this.rotateEvery = 10;
        this.currentProxy = null;
        this.initialized = false;
    }

    async initBrowser(headless = true) {
        console.log('[FreeProxy] Initializing with free proxies...');
        
        // Fetch and test proxies
        await freeProxyFetcher.fetchProxies();
        const workingProxies = await freeProxyFetcher.findWorkingProxies(10);
        
        if (workingProxies.length === 0) {
            console.log('[FreeProxy] No working free proxies found, using direct connection');
            return this.initDirectConnection(headless);
        }

        // Get first working proxy
        this.currentProxy = freeProxyFetcher.getNextProxy();
        console.log(`[FreeProxy] Using proxy: ${this.currentProxy.host}:${this.currentProxy.port}`);

        try {
            this.browser = await firefox.launch({
                headless,
                proxy: {
                    server: freeProxyFetcher.getProxyUrl(this.currentProxy)
                }
            });

            this.context = await this.browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                locale: 'en-IN',
                timezoneId: 'Asia/Kolkata',
            });

            this.initialized = true;
            
            // Verify IP changed
            const newIP = await this.checkIP();
            console.log(`[FreeProxy] Current IP: ${newIP}`);
            
            return true;
        } catch (error) {
            console.error('[FreeProxy] Error with proxy, trying direct:', error.message);
            return this.initDirectConnection(headless);
        }
    }

    async initDirectConnection(headless = true) {
        this.browser = await firefox.launch({ headless });
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'en-IN',
            timezoneId: 'Asia/Kolkata',
        });
        this.initialized = true;
        return true;
    }

    async checkIP() {
        try {
            const page = await this.context.newPage();
            await page.goto('https://api.ipify.org/?format=json', { timeout: 15000 });
            const content = await page.textContent('body');
            await page.close();
            const json = JSON.parse(content);
            return json.ip;
        } catch (error) {
            return 'Unknown';
        }
    }

    async rotateProxy() {
        console.log('[FreeProxy] Rotating to next proxy...');
        
        // Close current browser
        if (this.browser) {
            await this.browser.close();
        }

        // Get next proxy
        this.currentProxy = freeProxyFetcher.getNextProxy();
        
        if (!this.currentProxy) {
            console.log('[FreeProxy] No more proxies, fetching new ones...');
            await freeProxyFetcher.findWorkingProxies(10);
            this.currentProxy = freeProxyFetcher.getNextProxy();
        }

        if (this.currentProxy) {
            console.log(`[FreeProxy] New proxy: ${this.currentProxy.host}:${this.currentProxy.port}`);
            
            this.browser = await firefox.launch({
                headless: true,
                proxy: {
                    server: freeProxyFetcher.getProxyUrl(this.currentProxy)
                }
            });

            this.context = await this.browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                locale: 'en-IN',
                timezoneId: 'Asia/Kolkata',
            });
        }

        this.visitCount = 0;
        return this.currentProxy;
    }

    setRotateEvery(count) {
        this.rotateEvery = count;
        console.log(`[FreeProxy] Will rotate proxy every ${count} visits`);
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
        }
    }

    async visitPage(url, options = {}) {
        if (!this.initialized) {
            throw new Error('Browser not initialized');
        }

        // Check if rotation needed
        this.visitCount++;
        if (this.visitCount >= this.rotateEvery) {
            await this.rotateProxy();
        }

        const page = await this.context.newPage();
        const result = { success: false, url };

        try {
            await this.applyStealthScripts(page);
            await page.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: options.timeout || 30000 
            });

            await this.simulateHumanBehavior(page, options.minTime || 15, options.maxTime || 30);
            
            result.success = true;
            result.proxy = this.currentProxy ? `${this.currentProxy.host}:${this.currentProxy.port}` : 'direct';

        } catch (error) {
            result.error = error.message;
            console.error(`[FreeProxy] Visit error: ${error.message}`);
        } finally {
            await page.close();
        }

        return result;
    }

    async applyStealthScripts(page) {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-US', 'en'] });
        });
    }

    async simulateHumanBehavior(page, minTime, maxTime) {
        const visitDuration = (minTime + Math.random() * (maxTime - minTime)) * 1000;
        const scrolls = Math.floor(Math.random() * 5) + 3;

        for (let i = 0; i < scrolls; i++) {
            const scrollAmount = Math.floor(Math.random() * 500) + 200;
            await page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
            await page.waitForTimeout(Math.random() * 2000 + 1000);
        }

        const elapsed = scrolls * 3000;
        const remaining = Math.max(0, visitDuration - elapsed);
        if (remaining > 0) {
            await page.waitForTimeout(remaining);
        }
    }
}

module.exports = new BrowserFreeProxyService();
