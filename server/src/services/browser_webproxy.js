/**
 * Browser Service using Web Proxy (CroxyProxy, etc.)
 * Routes all traffic through free web proxy services
 */

const { firefox, chromium } = require('playwright');
const Tesseract = require('tesseract.js');

class BrowserWebProxyService {
    constructor() {
        this.browser = null;
        this.context = null;
        this.visitCount = 0;
        this.rotateEvery = 10;
        this.currentProxyIndex = 0;
        this.tabCount = 3; // Number of parallel tabs (each gets different IP)
        
        // List of free web proxy services - each tab uses different service for more IPs!
        this.webProxies = [
            {
                name: 'CroxyProxy',
                baseUrl: 'https://www.croxyproxy.com',
                inputSelectors: ['.typeahead__field input', 'input[placeholder*="URL"]', 'input[placeholder*="Enter"]', '#url'],
                submitSelectors: ['button:has-text("Go")', '.typeahead__button button', 'button[type="submit"]'],
                method: 'form'
            },
            {
                name: 'SSLUnblocker',
                baseUrl: 'https://www.sslunblocker.com',
                inputSelectors: ['input[name="u"]', 'input[type="text"]', '#url', 'input.form-control'],
                submitSelectors: ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Go")', '.btn-primary'],
                method: 'form'
            },
            {
                name: 'ProxySite',
                baseUrl: 'https://www.proxysite.com',
                inputSelectors: ['#url', 'input[name="d"]', 'input[type="text"]', 'input.form-control'],
                submitSelectors: ['#go', 'button[type="submit"]', 'input[type="submit"]'],
                method: 'form'
            },
            {
                name: 'CroxyProxy2',
                baseUrl: 'https://www.croxyproxy.rocks',
                inputSelectors: ['.typeahead__field input', 'input[placeholder*="URL"]', '#url'],
                submitSelectors: ['button:has-text("Go")', 'button[type="submit"]'],
                method: 'form'
            },
            {
                name: 'BlockAway',
                baseUrl: 'https://www.blockaway.net',
                inputSelectors: ['.typeahead__field input', 'input[placeholder*="URL"]', '#url'],
                submitSelectors: ['button:has-text("Go")', 'button[type="submit"]'],
                method: 'form'
            }
        ];
        
        // Multi-browser support
        this.browsers = [];
        this.contexts = [];
        this.browserCount = 3; // Number of browser instances
    }

    async initBrowser(headless = false) {
        // Close any existing browsers first
        if (this.browsers.length > 0) {
            console.log(`[WebProxy] Closing ${this.browsers.length} existing browsers...`);
            await this.closeBrowser();
        }
        
        // Reset arrays
        this.browsers = [];
        this.contexts = [];
        
        console.log(`[WebProxy] Initializing ${this.browserCount} browsers with ${this.tabCount} tabs each...`);
        console.log(`[WebProxy] Total parallel capacity: ${this.browserCount * this.tabCount} visits!`);
        
        this.headless = headless;
        
        // Launch multiple browser instances
        for (let i = 0; i < this.browserCount; i++) {
            const browser = await chromium.launch({
                headless,
                args: [
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled',
                ]
            });

            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                viewport: { width: 1280, height: 720 },
                locale: 'en-IN',
                timezoneId: 'Asia/Kolkata',
            });

            this.browsers.push(browser);
            this.contexts.push(context);
            console.log(`[WebProxy] Browser ${i + 1}/${this.browserCount} initialized`);
        }
        
        // Keep backward compatibility
        this.browser = this.browsers[0];
        this.context = this.contexts[0];

        console.log(`[WebProxy] ✅ All ${this.browserCount} browsers ready!`);
        return true;
    }

    async closeBrowser() {
        // Close all browser instances
        for (const browser of this.browsers) {
            try {
                await browser.close();
            } catch (e) {}
        }
        this.browsers = [];
        this.contexts = [];
        this.browser = null;
        this.context = null;
        console.log('[WebProxy] All browsers closed');
    }

    setBrowserCount(count) {
        this.browserCount = parseInt(count) || 3;
        console.log(`[WebProxy] 🖥️ Browser count set to: ${this.browserCount}`);
    }

    setRotateEvery(count) {
        this.rotateEvery = count;
        console.log(`[WebProxy] Will rotate proxy every ${count} visits`);
    }
    
    /**
     * Set number of tabs for parallel visits
     */
    setTabCount(count) {
        this.tabCount = parseInt(count) || 5;
        console.log(`[WebProxy] 📑 Tab count set to: ${this.tabCount} per browser`);
        console.log(`[WebProxy] ⚡ Total capacity: ${this.browserCount} × ${this.tabCount} = ${this.browserCount * this.tabCount} parallel visits`);
    }

    /**
     * Get current web proxy
     */
    getCurrentProxy() {
        return this.webProxies[this.currentProxyIndex];
    }

    /**
     * Rotate to next web proxy
     */
    rotateProxy() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.webProxies.length;
        console.log(`[WebProxy] Rotated to: ${this.getCurrentProxy().name}`);
    }

    /**
     * Visit URL through CroxyProxy (direct method)
     */
    async visitViaCroxyProxy(page, targetUrl) {
        // CroxyProxy has a special URL encoding
        const encodedUrl = Buffer.from(targetUrl).toString('base64');
        const proxyUrl = `https://www.croxyproxy.com/browse.php?u=${encodeURIComponent(encodedUrl)}&b=4`;
        
        console.log(`[WebProxy] Visiting via CroxyProxy: ${targetUrl}`);
        
        await page.goto(proxyUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });

        // Wait for page to load through proxy
        await page.waitForTimeout(3000);
        
        return true;
    }

    /**
     * Visit URL through web proxy form submission
     */
    async visitViaProxyForm(page, targetUrl, proxy) {
        console.log(`[WebProxy] Visiting via ${proxy.name}: ${targetUrl}`);
        
        // Go to proxy site
        await page.goto(proxy.baseUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 30000 
        });

        await page.waitForTimeout(2000);

        // Enter URL in the input field
        await page.fill(proxy.inputSelector, targetUrl);
        
        // Submit the form
        await page.click(proxy.submitSelector);
        
        // Wait for the target page to load through proxy
        await page.waitForTimeout(5000);
        
        return true;
    }

    /**
     * Main visit function - single URL
     */
    async visitPage(url, options = {}) {
        const page = await this.context.newPage();
        const result = { success: false, url };

        try {
            // Apply stealth scripts
            await this.applyStealthScripts(page);

            // Visit through CroxyProxy
            await this.visitViaCroxyProxySimple(page, url);

            // Simulate human behavior on the proxied page
            await this.simulateHumanBehavior(page, options.minTime || 15, options.maxTime || 30);

            this.visitCount++;
            result.success = true;
            result.proxy = 'CroxyProxy';

        } catch (error) {
            result.error = error.message;
            console.error(`[WebProxy] Error: ${error.message}`);
        } finally {
            await page.close();
        }

        return result;
    }

    /**
     * Visit multiple URLs in parallel using MULTIPLE BROWSERS + MULTIPLE TABS
     * Each browser has 5 tabs, each tab uses different proxy service!
     * 3 browsers × 5 tabs = 15 parallel visits with 15 different IPs!
     */
    async visitMultipleTabs(urls, options = {}) {
        const tabsPerBrowser = options.tabCount || 5;
        const minTime = options.minTime || 15;
        const maxTime = options.maxTime || 30;
        
        const totalCapacity = this.browserCount * tabsPerBrowser;
        console.log(`[WebProxy] 🚀 TURBO MODE: ${this.browserCount} browsers × ${tabsPerBrowser} tabs = ${totalCapacity} parallel visits!`);
        console.log(`[WebProxy] Using ${this.webProxies.length} different proxy services`);
        
        const results = [];
        
        // Process URLs in batches of (browserCount × tabsPerBrowser)
        for (let i = 0; i < urls.length; i += totalCapacity) {
            const batch = urls.slice(i, i + totalCapacity);
            console.log(`[WebProxy] ═══ Batch ${Math.floor(i/totalCapacity) + 1}: Processing ${batch.length} URLs ═══`);
            
            // Distribute URLs across browsers
            const browserPromises = [];
            
            for (let browserIdx = 0; browserIdx < this.browsers.length && batch.length > 0; browserIdx++) {
                const context = this.contexts[browserIdx];
                const startIdx = browserIdx * tabsPerBrowser;
                const browserBatch = batch.slice(startIdx, startIdx + tabsPerBrowser);
                
                if (browserBatch.length === 0) continue;
                
                // Each browser opens its tabs in parallel
                const browserPromise = (async () => {
                    const tabResults = [];
                    
                    console.log(`[WebProxy] Browser ${browserIdx + 1}: Opening ${browserBatch.length} tabs...`);
                    
                    const tabPromises = browserBatch.map(async (url, tabIdx) => {
                        const page = await context.newPage();
                        const proxyService = this.webProxies[tabIdx % this.webProxies.length];
                        const globalIdx = startIdx + tabIdx + 1;
                        const result = { success: false, url, browser: browserIdx + 1, tab: tabIdx + 1, proxy: proxyService.name };
                        
                        try {
                            await this.applyStealthScripts(page);
                            
                            console.log(`[B${browserIdx + 1}-T${tabIdx + 1}] Using ${proxyService.name} for ${url.substring(0, 50)}...`);
                            await this.visitViaProxyService(page, url, proxyService);
                            
                            await this.simulateHumanBehavior(page, minTime, maxTime);
                            
                            this.visitCount++;
                            result.success = true;
                            console.log(`[B${browserIdx + 1}-T${tabIdx + 1}] ✓ Done via ${proxyService.name}`);
                            
                        } catch (error) {
                            result.error = error.message;
                            console.error(`[B${browserIdx + 1}-T${tabIdx + 1}] ✗ Error: ${error.message.substring(0, 80)}`);
                        } finally {
                            try {
                                if (!page.isClosed()) {
                                    await page.close();
                                }
                            } catch (e) {
                                // Page already closed, ignore
                            }
                        }
                        
                        return result;
                    });
                    
                    return Promise.all(tabPromises);
                })();
                
                browserPromises.push(browserPromise);
            }
            
            // Wait for ALL browsers to complete their tabs
            const allBrowserResults = await Promise.all(browserPromises);
            for (const browserResults of allBrowserResults) {
                results.push(...browserResults);
            }
            
            // Small delay between batches
            if (i + totalCapacity < urls.length) {
                console.log(`[WebProxy] ⏳ Waiting 2s before next batch...`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        console.log(`[WebProxy] 🏁 Completed: ${successCount}/${results.length} visits successful`);
        
        return results;
    }

    /**
     * Simple CroxyProxy visit - just navigate to their form
     */
    async visitViaCroxyProxySimple(page, targetUrl) {
        console.log(`[WebProxy] Loading CroxyProxy...`);
        
        // Go to CroxyProxy
        await page.goto('https://www.croxyproxy.com/', { 
            waitUntil: 'networkidle', 
            timeout: 30000 
        });

        // Wait for page load
        await page.waitForTimeout(3000);

        // Take screenshot for debugging
        await page.screenshot({ path: 'croxyproxy_loaded.png' });
        console.log(`[WebProxy] Screenshot saved to croxyproxy_loaded.png`);

        // The input field is inside .typeahead__field container
        // Try multiple selectors to find the URL input
        const inputSelectors = [
            '.typeahead__field input',
            'input.js-form-typeahead',
            'input[placeholder*="URL"]',
            'input[placeholder*="Enter"]',
            '#url',
            'input[name="url"]',
            '.typeahead__query input'
        ];

        let inputFound = false;
        for (const selector of inputSelectors) {
            try {
                const input = await page.$(selector);
                if (input) {
                    // Click first to focus
                    await input.click();
                    await page.waitForTimeout(500);
                    
                    // Clear and type the URL
                    await input.fill('');
                    await input.type(targetUrl, { delay: 50 });
                    
                    console.log(`[WebProxy] Entered URL using selector: ${selector}`);
                    inputFound = true;
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        if (!inputFound) {
            console.log(`[WebProxy] Could not find input field, trying keyboard approach...`);
            // Just type the URL - it might auto-focus
            await page.keyboard.type(targetUrl, { delay: 50 });
        }

        await page.waitForTimeout(1000);

        // Click the Go button - try multiple selectors
        const buttonSelectors = [
            'button:has-text("Go")',
            '.typeahead__button button',
            'button[type="submit"]',
            'button.btn-success',
            'button:has-text("→")'
        ];

        let buttonClicked = false;
        for (const selector of buttonSelectors) {
            try {
                const button = await page.$(selector);
                if (button) {
                    await button.click();
                    console.log(`[WebProxy] Clicked Go button using selector: ${selector}`);
                    buttonClicked = true;
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        if (!buttonClicked) {
            // Try pressing Enter
            console.log(`[WebProxy] Pressing Enter to submit...`);
            await page.keyboard.press('Enter');
        }

        // Wait for navigation
        await page.waitForTimeout(8000);
        
        // Take screenshot after submission
        await page.screenshot({ path: 'croxyproxy_result.png' });
        console.log(`[WebProxy] Page loaded through proxy, screenshot saved`);

        return true;
    }

    /**
     * Visit URL through ANY proxy service (CroxyProxy, SSLUnblocker, ProxySite, etc.)
     * @param {Page} page - Playwright page
     * @param {string} targetUrl - URL to visit through proxy
     * @param {object} proxyService - Proxy service config with selectors
     */
    async visitViaProxyService(page, targetUrl, proxyService) {
        console.log(`[WebProxy] Loading ${proxyService.name}...`);
        
        // Go to proxy service
        await page.goto(proxyService.baseUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 30000 
        });

        // Wait for page load
        await page.waitForTimeout(3000);

        // Try to find and fill the URL input using service-specific selectors
        let inputFound = false;
        for (const selector of proxyService.inputSelectors) {
            try {
                const input = await page.$(selector);
                if (input) {
                    await input.click();
                    await page.waitForTimeout(300);
                    await input.fill('');
                    await input.type(targetUrl, { delay: 30 });
                    console.log(`[${proxyService.name}] Entered URL using: ${selector}`);
                    inputFound = true;
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        if (!inputFound) {
            // Try generic approach
            await page.keyboard.type(targetUrl, { delay: 30 });
        }

        await page.waitForTimeout(500);

        // Click submit button using service-specific selectors
        let buttonClicked = false;
        for (const selector of proxyService.submitSelectors) {
            try {
                const button = await page.$(selector);
                if (button) {
                    await button.click();
                    console.log(`[${proxyService.name}] Clicked submit using: ${selector}`);
                    buttonClicked = true;
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        if (!buttonClicked) {
            await page.keyboard.press('Enter');
        }

        // Wait for target page to load through proxy
        await page.waitForTimeout(8000);
        
        console.log(`[${proxyService.name}] Page loaded through proxy`);
        return true;
    }

    async applyStealthScripts(page) {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-US', 'en'] });
        });
    }

    async simulateHumanBehavior(page, minTime, maxTime) {
        try {
            const visitDuration = (minTime + Math.random() * (maxTime - minTime)) * 1000;
            const scrolls = Math.floor(Math.random() * 5) + 3;

            // Check if page is still valid
            if (page.isClosed()) return;

            for (let i = 0; i < scrolls; i++) {
                try {
                    const scrollAmount = Math.floor(Math.random() * 500) + 200;
                    await page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
                    await page.waitForTimeout(Math.random() * 2000 + 1000);
                } catch (e) {
                    // Page context destroyed during scroll, continue
                    if (e.message.includes('Execution context was destroyed')) {
                        break;
                    }
                }
            }

            // Random mouse movements
            for (let i = 0; i < 3; i++) {
                try {
                    if (page.isClosed()) break;
                    const x = Math.floor(Math.random() * 1200) + 100;
                    const y = Math.floor(Math.random() * 600) + 100;
                    await page.mouse.move(x, y);
                    await page.waitForTimeout(Math.random() * 500 + 200);
                } catch (e) {
                    // Page context destroyed during mouse move, continue
                    if (e.message.includes('Target page, context or browser has been closed')) {
                        break;
                    }
                }
            }

            const elapsed = scrolls * 3000;
            const remaining = Math.max(0, visitDuration - elapsed);
            if (remaining > 0) {
                try {
                    await page.waitForTimeout(remaining);
                } catch (e) {
                    // Page closed, ignore
                }
            }
        } catch (e) {
            // Silently handle any page context errors
            console.log(`[WebProxy] Behavior simulation ended: ${e.message.substring(0, 50)}`);
        }
    }

    /**
     * Check current IP through the proxy
     */
    async checkIP() {
        try {
            const page = await this.context.newPage();
            
            // Visit IP check through CroxyProxy
            await page.goto('https://www.croxyproxy.com/', { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(2000);
            
            await page.fill('#url', 'https://api.ipify.org/?format=json');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(5000);
            
            const content = await page.textContent('body');
            await page.close();
            
            // Try to extract IP from response
            const match = content.match(/"ip"\s*:\s*"([^"]+)"/);
            if (match) {
                return match[1];
            }
            return 'Check manually';
        } catch (error) {
            return 'Unknown';
        }
    }

    /**
     * runVisit - Alias for visitPage (compatibility with jobManager)
     * @param {string} url - URL to visit
     * @param {object} proxyConfig - Ignored (we use web proxy)
     * @param {object} options - Options including tabCount for multi-tab mode
     */
    async runVisit(url, proxyConfig = null, options = {}) {
        // proxyConfig is ignored - we use web proxy instead
        console.log(`[WebProxy] Visiting: ${url}`);
        return this.visitPage(url, options);
    }

    /**
     * Run multiple visits in parallel with different IPs
     * @param {string[]} urls - Array of URLs to visit
     * @param {number} tabCount - Number of parallel tabs
     */
    async runMultiTabVisits(urls, tabCount = 3, options = {}) {
        return this.visitMultipleTabs(urls, { ...options, tabCount });
    }
}

module.exports = new BrowserWebProxyService();
