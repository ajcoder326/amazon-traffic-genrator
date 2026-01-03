const { firefox } = require('playwright');
const Tesseract = require('tesseract.js');

class BrowserService {
    constructor() {
        this.browser = null;
    }

    async initBrowser(headless = true) {
        if (this.browser) return;
        console.log(`Launching Global Browser (Headless: ${headless})...`);
        this.browser = await firefox.launch({
            headless: headless,
        });
        console.log('Global Browser Launched');
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('Global Browser Closed');
        }
    }

    async runVisit(url, proxyConfig, retryCount = 0) {
        const MAX_RETRIES = 2;
        
        if (!this.browser) {
            return { success: false, error: "Browser not initialized" };
        }

        let context = null;
        let page = null;

        try {
            const contextOptions = {
                viewport: { width: 1366 + Math.floor(Math.random() * 100), height: 768 + Math.floor(Math.random() * 50) },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
                locale: 'en-US',
                timezoneId: 'America/New_York',
                ignoreHTTPSErrors: true
            };

            if (proxyConfig) {
                contextOptions.proxy = {
                    server: proxyConfig.server,
                    username: proxyConfig.username,
                    password: proxyConfig.password
                };
            }

            // Create isolated context (incognito profile)
            context = await this.browser.newContext(contextOptions);
            page = await context.newPage();

            // Set shorter timeout for initial connection to detect bad proxies faster
            page.setDefaultTimeout(45000);

            console.log(`Visiting ${url}${proxyConfig ? ` via ${proxyConfig.server}` : ''}...`);
            
            // Try navigation with better error handling
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            } catch (navError) {
                // Parse the error to give more helpful message
                const errorMsg = navError.message || String(navError);
                
                if (errorMsg.includes('net::ERR_PROXY') || errorMsg.includes('unknown error') || errorMsg.includes('NS_ERROR')) {
                    throw new Error(`Proxy connection failed (${proxyConfig ? proxyConfig.server : 'direct'})`);
                } else if (errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
                    throw new Error(`Page load timeout - proxy may be slow or blocked`);
                } else if (errorMsg.includes('ERR_CONNECTION')) {
                    throw new Error(`Connection refused - proxy may be dead`);
                } else {
                    throw navError;
                }
            }

            // --- INTERVENTION HANDLING ---
            await this.handleInterventions(page);
            await this.checkAndSolveCaptcha(page);

            // Double check in case captcha reload happened
            await this.handleInterventions(page);

            // --- Interaction Logic ---

            // 1. Scroll to reviews
            await this.smoothScroll(page);

            // 2. Hover over image 
            await this.hoverImage(page);

            // 3. Click Buy Now 
            await this.clickBuyNow(page);

            await page.waitForTimeout(2000);

            return { success: true };

        } catch (error) {
            const errorMsg = error.message || String(error);
            console.error(`Error visiting ${url}:`, errorMsg);
            
            // Determine if error is retryable (proxy issues)
            const isProxyError = errorMsg.includes('Proxy') || 
                                 errorMsg.includes('timeout') || 
                                 errorMsg.includes('Connection') ||
                                 errorMsg.includes('unknown error') ||
                                 errorMsg.includes('NS_ERROR');
            
            // Clean up before potential retry
            if (page) await page.close().catch(() => { });
            if (context) await context.close().catch(() => { });
            
            // Retry logic for proxy failures (without proxy)
            if (isProxyError && retryCount < MAX_RETRIES && proxyConfig) {
                console.log(`[Retry ${retryCount + 1}/${MAX_RETRIES}] Retrying ${url} without proxy...`);
                return await this.runVisit(url, null, retryCount + 1);
            }
            
            return { success: false, error: errorMsg };
        } finally {
            // Only close if not already closed in catch block
            if (page) await page.close().catch(() => { });
            if (context) await context.close().catch(() => { });
        }
    }

    // --- LOGIC METHODS ---

    async handleInterventions(page) {
        try {
            // Check for "Continue shopping" button (Amazon soft-block)
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
                await page.waitForLoadState('domcontentloaded').catch(() => { });
            }
        } catch (e) {
            // console.log("Intervention check failed", e.message);
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

                // Clean text
                const solution = text.replace(/[^a-zA-Z]/g, '').toUpperCase().trim();

                console.log(`[BrowserService] Captcha solution guess: ${solution}`);

                if (solution.length > 0) {
                    await page.fill(captchaInputSelector, solution);

                    // Click and wait for navigation
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
                window.scrollTo({ top: distance, behavior: 'smooth' });
                await new Promise(r => setTimeout(r, delay));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            await page.waitForTimeout(1000);
        } catch (e) {
            // console.log('Scroll failed', e.message);
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
            // console.log('Hover failed', e.message);
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
            // console.log('Buy Now failed', e.message);
        }
    }
}

module.exports = new BrowserService();
