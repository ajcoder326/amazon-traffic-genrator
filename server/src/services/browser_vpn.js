/**
 * Browser Service with VPN Extension Support
 * Uses Chromium + Planet VPN extension for IP rotation
 */

const { chromium } = require('playwright');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

class BrowserVPNService {
    constructor() {
        this.browser = null;
        this.extensionPath = path.join(__dirname, '../../extensions/planet-vpn');
        this.currentServer = null;
        this.visitCount = 0;
        this.rotateEvery = 10; // Rotate VPN server every X visits
        this.availableServers = ['Germany', 'Netherlands', 'USA', 'UK', 'France']; // Free Planet VPN servers
        this.serverIndex = 0;
        this.vpnPage = null; // Keep VPN popup page reference
        this.mainContext = null;
    }

    async initBrowser(headless = false) {
        // VPN extensions work best in headed mode
        if (headless) {
            console.log('[VPN] Warning: VPN extensions work better in headed mode. Forcing headed...');
            headless = false;
        }

        // Check if extension exists
        if (!fs.existsSync(this.extensionPath)) {
            console.error(`[VPN] Extension not found at: ${this.extensionPath}`);
            console.error('[VPN] Please run: node download_extension.js');
            throw new Error('Planet VPN extension not found. Run download_extension.js first.');
        }

        // Check for manifest.json
        const manifestPath = path.join(this.extensionPath, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error('Invalid extension: manifest.json not found');
        }

        console.log(`[VPN] Loading extension from: ${this.extensionPath}`);

        // Launch Chromium with extension
        this.browser = await chromium.launchPersistentContext(
            path.join(__dirname, '../../.chrome-profile'), // Persistent profile to keep VPN logged in
            {
                headless: false, // Extensions require headed mode
                args: [
                    `--disable-extensions-except=${this.extensionPath}`,
                    `--load-extension=${this.extensionPath}`,
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled',
                ],
                viewport: { width: 1366, height: 768 },
                ignoreHTTPSErrors: true,
            }
        );

        console.log('[VPN] Browser launched with Planet VPN extension');

        // Wait for extension to load
        await new Promise(r => setTimeout(r, 3000));

        // Initial VPN connection
        await this.connectVPN();

        return true;
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.vpnPage = null;
            console.log('[VPN] Browser closed');
        }
    }

    async connectVPN(serverName = null) {
        if (!this.browser) {
            throw new Error('Browser not initialized');
        }

        try {
            console.log('[VPN] Opening VPN extension popup...');

            // Get extension ID from the loaded extensions
            const extensionId = 'hipncndjamdcmphkgngojegjblibadbe';
            const popupUrl = `chrome-extension://${extensionId}/popup.html`;

            // Open extension popup in a new page
            const vpnPage = await this.browser.newPage();
            await vpnPage.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            
            // Wait for Vue app to render
            await vpnPage.waitForTimeout(3000);

            // Take screenshot for debugging
            await vpnPage.screenshot({ path: 'vpn-popup-debug.png' });
            console.log('[VPN] Screenshot saved to vpn-popup-debug.png');

            // Check if already connected by looking for red disconnect button
            const isConnected = await vpnPage.evaluate(() => {
                // Connected state shows red "Disconnect" button
                const redButton = document.querySelector('.v-button--red');
                const buttonText = document.querySelector('.connect-button button');
                if (buttonText) {
                    const text = buttonText.textContent?.toLowerCase() || '';
                    return text.includes('disconnect') || text.includes('protected');
                }
                return !!redButton;
            });

            if (!isConnected) {
                console.log('[VPN] Not connected. Clicking connect button...');
                
                // Click the green connect button
                const clicked = await vpnPage.evaluate(() => {
                    // Planet VPN uses .v-button--green for connect
                    const greenBtn = document.querySelector('.v-button--green');
                    if (greenBtn) {
                        greenBtn.click();
                        return true;
                    }
                    
                    // Fallback: any button in connect-button section
                    const connectSection = document.querySelector('.connect-button');
                    if (connectSection) {
                        const btn = connectSection.querySelector('button');
                        if (btn) {
                            btn.click();
                            return true;
                        }
                    }
                    
                    return false;
                });

                if (clicked) {
                    console.log('[VPN] Connect button clicked, waiting for connection...');
                    // Wait for connection (VPN needs time to establish)
                    await vpnPage.waitForTimeout(8000);
                    
                    // Check if connected now
                    const connectedNow = await vpnPage.evaluate(() => {
                        const redButton = document.querySelector('.v-button--red');
                        return !!redButton;
                    });
                    
                    if (connectedNow) {
                        console.log('[VPN] ✅ VPN Connected successfully!');
                    } else {
                        console.log('[VPN] ⚠️ Connection status unclear, continuing anyway...');
                    }
                } else {
                    console.log('[VPN] ⚠️ Could not find connect button');
                }
            } else {
                console.log('[VPN] ✅ Already connected to VPN');
            }

            // If specific server requested, try to change
            if (serverName) {
                await this.selectServer(vpnPage, serverName);
            }

            this.currentServer = serverName || 'Auto';
            await vpnPage.close();

            // Verify IP changed
            const newIP = await this.checkIP();
            console.log(`[VPN] Current IP: ${newIP}`);

            return true;
        } catch (error) {
            console.error('[VPN] Error connecting to VPN:', error.message);
            return false;
        }
    }

    async selectServer(vpnPage, serverName) {
        try {
            console.log(`[VPN] Selecting server: ${serverName}`);

            // Click on server selector / location button
            await vpnPage.evaluate((server) => {
                // Look for server list or location selector
                const serverBtns = document.querySelectorAll(
                    '.server-item, .location-item, [class*="server"], [class*="location"], li'
                );
                
                for (const btn of serverBtns) {
                    if (btn.textContent?.toLowerCase().includes(server.toLowerCase())) {
                        btn.click();
                        return true;
                    }
                }

                // Try clicking dropdown first
                const dropdown = document.querySelector(
                    '.server-dropdown, .location-dropdown, [class*="select"], .dropdown'
                );
                if (dropdown) dropdown.click();

                return false;
            }, serverName);

            await vpnPage.waitForTimeout(3000);
        } catch (error) {
            console.error('[VPN] Error selecting server:', error.message);
        }
    }

    async rotateServer() {
        console.log('[VPN] Rotating to next server...');
        
        this.serverIndex = (this.serverIndex + 1) % this.availableServers.length;
        const nextServer = this.availableServers[this.serverIndex];
        
        await this.connectVPN(nextServer);
    }

    async checkIP() {
        try {
            const page = await this.browser.newPage();
            await page.goto('https://api.ipify.org?format=json', { timeout: 15000 });
            const content = await page.content();
            const match = content.match(/"ip":"([^"]+)"/);
            await page.close();
            return match ? match[1] : 'Unknown';
        } catch (error) {
            return 'Error checking IP';
        }
    }

    async runVisit(url, proxyConfig = null) {
        // proxyConfig is ignored when using VPN extension
        
        if (!this.browser) {
            return { success: false, error: "Browser not initialized" };
        }

        let page = null;

        try {
            // Check if we need to rotate VPN
            this.visitCount++;
            if (this.visitCount > 1 && this.visitCount % this.rotateEvery === 0) {
                console.log(`[VPN] Visited ${this.visitCount} pages, rotating server...`);
                await this.rotateServer();
            }

            // Create new page for visit
            page = await this.browser.newPage();

            // Set viewport with slight randomization
            await page.setViewportSize({
                width: 1366 + Math.floor(Math.random() * 100),
                height: 768 + Math.floor(Math.random() * 50)
            });

            console.log(`[VPN] Visiting ${url} (Visit #${this.visitCount})...`);
            
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
            console.error(`[VPN] Error visiting ${url}:`, error.message);
            return { success: false, error: error.message };
        } finally {
            if (page) await page.close().catch(() => { });
        }
    }

    // --- Interaction Methods (same as original) ---

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
                console.log("[VPN] 'Continue Shopping' intervention handled.");
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
                console.log("[VPN] CAPTCHA detected! Attempting to solve...");

                const screenshotBuffer = await imgElement.screenshot();
                const { data: { text } } = await Tesseract.recognize(screenshotBuffer, 'eng');
                const solution = text.replace(/[^a-zA-Z]/g, '').toUpperCase().trim();

                console.log(`[VPN] Captcha solution guess: ${solution}`);

                if (solution.length > 0) {
                    await page.fill(captchaInputSelector, solution);
                    await Promise.all([
                        page.waitForNavigation({ timeout: 10000 }).catch(() => { }),
                        page.click(captchaSubmitSelector)
                    ]);
                    console.log("[VPN] Captcha submitted.");
                }
            }
        } catch (e) {
            console.error("[VPN] Captcha solving error:", e.message);
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

    // Get VPN status for UI
    getStatus() {
        return {
            connected: this.browser !== null,
            currentServer: this.currentServer,
            visitCount: this.visitCount,
            rotateEvery: this.rotateEvery
        };
    }

    // Set rotation frequency
    setRotateEvery(count) {
        this.rotateEvery = count;
        console.log(`[VPN] Will rotate server every ${count} visits`);
    }
}

module.exports = new BrowserVPNService();
