/**
 * Multi-Phone Browser Service
 * 
 * Runs multiple browser instances, each using a different phone's connection
 * Supports both parallel and round-robin modes
 */

const { firefox } = require('playwright');
const tesseract = require('tesseract.js');
const path = require('path');
const multiPhoneRotator = require('./multiPhoneRotator');

class MultiPhoneBrowserService {
    constructor() {
        this.browsers = new Map(); // deviceId -> browser instance
        this.contexts = new Map(); // deviceId -> context
        this.mode = 'round-robin'; // 'round-robin' or 'parallel'
    }

    /**
     * Initialize service and detect phones
     */
    async initialize(rotateEvery = 10) {
        console.log('[MultiPhoneBrowser] Initializing...');
        
        const devices = await multiPhoneRotator.scanDevices();
        
        if (devices.length === 0) {
            throw new Error('No Android devices found. Please connect phones via USB with debugging enabled.');
        }

        multiPhoneRotator.setRotateEvery(rotateEvery);

        console.log(`[MultiPhoneBrowser] Ready with ${devices.length} phone(s)`);
        
        return devices;
    }

    /**
     * Launch browser for a specific device
     */
    async launchBrowserForDevice(deviceId) {
        const browser = await firefox.launch({
            headless: true,
            args: ['--no-sandbox']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'en-IN',
            timezoneId: 'Asia/Kolkata',
            permissions: ['geolocation'],
            geolocation: { latitude: 19.0760, longitude: 72.8777 }, // Mumbai
        });

        this.browsers.set(deviceId, browser);
        this.contexts.set(deviceId, context);

        return { browser, context };
    }

    /**
     * Round-Robin Mode: Visit using next available device
     */
    async visitRoundRobin(url, options = {}) {
        const device = multiPhoneRotator.getNextDevice();
        if (!device) {
            throw new Error('No devices available');
        }

        // Check if device needs IP rotation
        if (multiPhoneRotator.needsRotation(device.id)) {
            await multiPhoneRotator.rotateIP(device.id);
        }

        // Get or create browser for this device
        let browser = this.browsers.get(device.id);
        let context = this.contexts.get(device.id);

        if (!browser) {
            const result = await this.launchBrowserForDevice(device.id);
            browser = result.browser;
            context = result.context;
        }

        const page = await context.newPage();

        try {
            // Anti-detection
            await this.applyStealthScripts(page);

            // Navigate
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Simulate behavior
            await this.simulateHumanBehavior(page, options.minTime || 15, options.maxTime || 30);

            // Update visit count
            multiPhoneRotator.incrementVisits(device.id);

            return {
                success: true,
                deviceId: device.id,
                deviceModel: device.model,
                carrier: device.carrier,
                url
            };

        } catch (error) {
            console.error(`[MultiPhoneBrowser] Error on ${device.id}:`, error.message);
            return { success: false, error: error.message, deviceId: device.id };
        } finally {
            await page.close();
        }
    }

    /**
     * Parallel Mode: Run callback on all devices simultaneously
     */
    async visitParallel(url, options = {}) {
        const devices = multiPhoneRotator.devices;
        
        if (devices.length === 0) {
            throw new Error('No devices available');
        }

        // Create browser for each device if not exists
        for (const device of devices) {
            if (!this.browsers.get(device.id)) {
                await this.launchBrowserForDevice(device.id);
            }
        }

        // Execute visits in parallel
        const promises = devices.map(async (device) => {
            const context = this.contexts.get(device.id);
            const page = await context.newPage();

            try {
                await this.applyStealthScripts(page);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await this.simulateHumanBehavior(page, options.minTime || 15, options.maxTime || 30);
                
                multiPhoneRotator.incrementVisits(device.id);

                return {
                    success: true,
                    deviceId: device.id,
                    deviceModel: device.model,
                    carrier: device.carrier
                };

            } catch (error) {
                return { success: false, deviceId: device.id, error: error.message };
            } finally {
                await page.close();
            }
        });

        return Promise.all(promises);
    }

    /**
     * Run multiple URLs across all devices (best utilization)
     */
    async processUrlsBatch(urls, options = {}) {
        const devices = multiPhoneRotator.devices;
        const results = [];
        
        // Distribute URLs across devices
        for (let i = 0; i < urls.length; i++) {
            const device = devices[i % devices.length];
            
            // Check rotation before use
            if (multiPhoneRotator.needsRotation(device.id)) {
                console.log(`[MultiPhoneBrowser] Rotating IP on ${device.model}...`);
                await multiPhoneRotator.rotateIP(device.id);
            }

            // Get or create browser
            if (!this.browsers.get(device.id)) {
                await this.launchBrowserForDevice(device.id);
            }

            const context = this.contexts.get(device.id);
            const page = await context.newPage();

            try {
                await this.applyStealthScripts(page);
                await page.goto(urls[i], { waitUntil: 'domcontentloaded', timeout: 30000 });
                await this.simulateHumanBehavior(page, options.minTime || 15, options.maxTime || 30);

                multiPhoneRotator.incrementVisits(device.id);

                results.push({
                    success: true,
                    url: urls[i],
                    deviceId: device.id,
                    deviceModel: device.model,
                    carrier: device.carrier
                });

                console.log(`[${device.model}] Visited: ${urls[i]}`);

            } catch (error) {
                results.push({
                    success: false,
                    url: urls[i],
                    deviceId: device.id,
                    error: error.message
                });
            } finally {
                await page.close();
            }
        }

        return results;
    }

    /**
     * Apply stealth scripts to avoid detection
     */
    async applyStealthScripts(page) {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-US', 'en'] });
            
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );

            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) return 'Intel Inc.';
                if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                return getParameter.apply(this, arguments);
            };
        });
    }

    /**
     * Simulate human behavior on page
     */
    async simulateHumanBehavior(page, minTime, maxTime) {
        const visitDuration = (minTime + Math.random() * (maxTime - minTime)) * 1000;
        const scrolls = Math.floor(Math.random() * 5) + 3;

        for (let i = 0; i < scrolls; i++) {
            const scrollAmount = Math.floor(Math.random() * 500) + 200;
            await page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
            await page.waitForTimeout(Math.random() * 2000 + 1000);
        }

        // Random mouse movements
        for (let i = 0; i < 3; i++) {
            const x = Math.floor(Math.random() * 1200) + 100;
            const y = Math.floor(Math.random() * 600) + 100;
            await page.mouse.move(x, y);
            await page.waitForTimeout(Math.random() * 500 + 200);
        }

        const elapsed = scrolls * 3000;
        const remaining = Math.max(0, visitDuration - elapsed);
        
        if (remaining > 0) {
            await page.waitForTimeout(remaining);
        }
    }

    /**
     * Solve CAPTCHA using Tesseract
     */
    async solveCaptcha(imageBuffer) {
        try {
            const { data: { text } } = await tesseract.recognize(imageBuffer, 'eng', {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
            });
            return text.trim();
        } catch (error) {
            console.error('[CAPTCHA] Recognition failed:', error.message);
            return '';
        }
    }

    /**
     * Get status of all phones
     */
    getStatus() {
        return multiPhoneRotator.getStatus();
    }

    /**
     * Close all browsers
     */
    async cleanup() {
        for (const [deviceId, browser] of this.browsers) {
            try {
                await browser.close();
            } catch (e) {}
        }
        this.browsers.clear();
        this.contexts.clear();
    }

    /**
     * Rotate IP on specific device
     */
    async rotateIP(deviceId) {
        return multiPhoneRotator.rotateIP(deviceId);
    }

    /**
     * Rotate all devices
     */
    async rotateAllIPs() {
        return multiPhoneRotator.rotateAllDevices();
    }
}

module.exports = new MultiPhoneBrowserService();
