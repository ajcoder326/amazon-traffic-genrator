const fs = require('fs');
const csv = require('csv-parser');
const proxyManager = require('./proxyManager');
const browserService = require('./browser_playwright');
const browserVPNService = require('./browser_vpn');
const browserMobileService = require('./browser_mobile');
const multiPhoneBrowserService = require('./browser_multiphone');
const browserWebProxyService = require('./browser_webproxy');

class JobManager {
    constructor() {
        this.isRunning = false;
        this.queue = [];
        this.activeThreads = 0;
        this.totalProcessed = 0;
        this.settings = {};
        this.io = null;
        this.currentCycle = 1;
        this.results = [];
        this.useVPN = false; // VPN mode flag
        this.activeBrowserService = null; // Current browser service
    }

    setSocketIo(io) {
        this.io = io;
    }

    async startJob(config) {
        if (this.isRunning) return { success: false, error: 'Job already running' };

        try {
            const { csvPath, proxyPath, settings } = config;
            this.settings = settings;
            this.results = []; // Keep existing reset
            this.totalProcessed = 0;
            this.activeThreads = 0;
            this.currentCycle = 1; // Keep existing reset
            this.isRunning = true;
            this.jobQueue = [];

            // Check connection mode
            this.useVPN = settings.useVPN === 'true' || settings.useVPN === true;
            this.useMobile = settings.useMobile === 'true' || settings.useMobile === true;
            this.useMultiPhone = settings.useMultiPhone === 'true' || settings.useMultiPhone === true;
            this.useWebProxy = settings.useWebProxy === 'true' || settings.useWebProxy === true;
            this.webProxyBrowserCount = parseInt(settings.webProxyBrowserCount) || 3; // Multi-browser support
            this.webProxyTabCount = parseInt(settings.webProxyTabCount) || 5; // Multi-tab support
            
            // Select browser service based on mode
            if (this.useWebProxy) {
                const totalParallel = this.webProxyBrowserCount * this.webProxyTabCount;
                console.log(`[JobManager] 🚀 Web Proxy TURBO Mode: ${this.webProxyBrowserCount} browsers × ${this.webProxyTabCount} tabs = ${totalParallel} parallel visits!`);
                this.activeBrowserService = browserWebProxyService;
                
                // Set rotation frequency if provided
                if (settings.webProxyRotateEvery) {
                    browserWebProxyService.setRotateEvery(parseInt(settings.webProxyRotateEvery) || 10);
                }
                browserWebProxyService.setBrowserCount(this.webProxyBrowserCount);
                browserWebProxyService.setTabCount(this.webProxyTabCount);
            } else if (this.useMultiPhone) {
                console.log('[JobManager] Using Multi-Phone Mode');
                this.activeBrowserService = multiPhoneBrowserService;
                
                // Initialize multi-phone service
                const rotateEvery = parseInt(settings.multiPhoneRotateEvery) || 10;
                await multiPhoneBrowserService.initialize(rotateEvery);
                
                // Set thread count to number of phones for parallel mode
                if (settings.multiPhoneParallel === 'true' || settings.multiPhoneParallel === true) {
                    const phoneCount = multiPhoneBrowserService.getStatus().totalDevices;
                    this.settings.threads = phoneCount;
                    console.log(`[JobManager] Parallel mode: ${phoneCount} threads (one per phone)`);
                }
            } else if (this.useMobile) {
                console.log('[JobManager] Using Mobile Mode (USB Tethering + ADB)');
                this.activeBrowserService = browserMobileService;
                
                // Set rotation frequency if provided
                if (settings.mobileRotateEvery) {
                    browserMobileService.setRotateEvery(parseInt(settings.mobileRotateEvery) || 10);
                }
            } else if (this.useVPN) {
                console.log('[JobManager] Using VPN Mode (Planet VPN)');
                this.activeBrowserService = browserVPNService;
                
                // Set rotation frequency if provided
                if (settings.vpnRotateEvery) {
                    browserVPNService.setRotateEvery(parseInt(settings.vpnRotateEvery) || 10);
                }
            } else {
                console.log('[JobManager] Using Proxy Mode');
                this.activeBrowserService = browserService;
                
                // Load Proxies
                if (proxyPath) {
                    proxyManager.loadProxies(proxyPath);
                }
            }

            // Load CSV and build queue
            const csvData = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(csvPath)
                    .pipe(csv({ headers: false }))
                    .on('data', (data) => csvData.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });

            const urls = this.generateUrls(csvData, settings.domain);
            if (urls.length === 0) throw new Error('No valid ASINs found');

            const cycles = parseInt(settings.cycles) || 1;

            for (let i = 0; i < cycles; i++) {
                urls.forEach(url => {
                    this.jobQueue.push({ url, cycle: i + 1 });
                });
            }

            console.log(`Job started with ${urls.length} ASINs, ${cycles} cycles.`);
            this.broadcastStatus(`Job started with ${urls.length} ASINs, ${cycles} cycles.${this.useVPN ? ' (VPN Mode)' : ''}`, 'running');

            // Initialize Browser (VPN or regular)
            const headless = this.settings.headless !== 'false';
            await this.activeBrowserService.initBrowser(headless);

            this.processQueue();

            return { success: true };
        } catch (error) {
            console.error(error);
            this.isRunning = false; // Ensure isRunning is false if job fails to start
            return { success: false, error: error.message };
        }
    }

    stopJob() {
        this.isRunning = false;
        this.jobQueue = []; // Changed from this.queue to this.jobQueue
        this.broadcastStatus('Job stopping...', 'stopped');

        // Close browser after short delay to allow pending to finish or force close
        setTimeout(async () => {
            if (this.activeBrowserService) {
                await this.activeBrowserService.closeBrowser();
            }
        }, 1000);
    }

    async processQueue() {
        if (!this.isRunning) return;

        // Check completion - ensure we verify against jobQueue not queue
        if (this.jobQueue.length === 0 && this.activeThreads === 0) {
            this.isRunning = false;
            // Send 100% progress
            this.broadcastProgress({
                processed: this.totalProcessed,
                activeThreads: 0
            });
            this.broadcastStatus('All cycles completed!', 'stopped');
            if (this.activeBrowserService) {
                this.activeBrowserService.closeBrowser();
            }
            return;
        }

        // SPECIAL: Web Proxy Multi-Tab Mode - process in batches
        if (this.useWebProxy && this.webProxyTabCount > 1) {
            await this.processWebProxyBatch();
            return;
        }

        // Spawn threads up to limit (VPN mode only supports 1 thread)
        let maxThreads = parseInt(this.settings.threads) || 1;
        if (this.useVPN && maxThreads > 1) {
            console.log('[JobManager] VPN mode: limiting to 1 thread');
            maxThreads = 1;
        }

        while (this.isRunning && this.jobQueue.length > 0 && this.activeThreads < maxThreads) {
            const job = this.jobQueue.shift();
            this.activeThreads++;

            // Start worker without awaiting it (fire and forget, but tracked via activeThreads)
            this.runWorker(job).then(() => {
                // this.processQueue(); // Handled inside runWorker now via setTimeout
            });

            // Stagger launches - Context creation is cheap, so we can be faster
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (this.activeThreads === 0 && this.jobQueue.length === 0 && this.isRunning) {
            this.isRunning = false;
            // Send 100% progress
            this.broadcastProgress({
                processed: this.totalProcessed,
                activeThreads: 0
            });
            this.broadcastStatus('All cycles completed!', 'stopped');
            if (this.activeBrowserService) {
                this.activeBrowserService.closeBrowser();
            }
        }
    }

    /**
     * Process URLs in batches using multiple browsers + tabs (Web Proxy TURBO mode)
     * 3 browsers × 5 tabs = 15 parallel visits with different IPs!
     */
    async processWebProxyBatch() {
        const browserCount = this.webProxyBrowserCount;
        const tabCount = this.webProxyTabCount;
        const batchSize = browserCount * tabCount; // Total parallel capacity
        
        console.log(`[JobManager] 🚀 TURBO: Using ${browserCount} browsers × ${tabCount} tabs = ${batchSize} parallel visits`);
        
        while (this.isRunning && this.jobQueue.length > 0) {
            // Get batch of URLs (browserCount × tabCount)
            const batch = [];
            for (let i = 0; i < batchSize && this.jobQueue.length > 0; i++) {
                batch.push(this.jobQueue.shift());
            }
            
            if (batch.length === 0) break;
            
            this.activeThreads = batch.length;
            this.broadcastProgress({
                activeThreads: batch.length,
                log: `🚀 TURBO: Opening ${batch.length} tabs across ${browserCount} browsers...`
            });
            
            // Extract URLs from jobs
            const urls = batch.map(job => job.url);
            
            // Visit all URLs in parallel using multi-browser + multi-tab
            const results = await browserWebProxyService.runMultiTabVisits(urls, tabCount, {
                minTime: parseInt(this.settings.minTime) || 15,
                maxTime: parseInt(this.settings.maxTime) || 30
            });
            
            // Process results
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                this.totalProcessed++;
                
                if (result.success) {
                    this.broadcastProgress({ 
                        log: `✓ Tab ${i+1}: ${result.url} visited via ${result.proxy}` 
                    });
                } else {
                    this.broadcastProgress({ 
                        log: `✗ Tab ${i+1}: ${result.url} - ${result.error}` 
                    });
                }
            }
            
            this.activeThreads = 0;
            this.broadcastProgress({
                processed: this.totalProcessed,
                activeThreads: 0
            });
            
            // Small delay between batches
            if (this.jobQueue.length > 0) {
                this.broadcastProgress({ log: `⏳ Waiting 2s before next batch...` });
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        
        // Job complete
        this.isRunning = false;
        this.broadcastProgress({
            processed: this.totalProcessed,
            activeThreads: 0
        });
        this.broadcastStatus('All cycles completed!', 'stopped');
        if (this.activeBrowserService) {
            this.activeBrowserService.closeBrowser();
        }
    }

    // ... runWorker and generateUrls remain same ...

    // ... broadcastStatus remains same ...



    async runWorker(job) {
        let proxy = null;
        let proxyConfig = null;
        let connectionInfo = 'Direct';

        // Web Proxy mode vs Mobile mode vs VPN mode vs Proxy mode
        if (this.useWebProxy) {
            connectionInfo = `🌐 WebProxy (CroxyProxy - Different IP each tab)`;
        } else if (this.useMobile) {
            const mobileStatus = browserMobileService.getStatus();
            connectionInfo = `📱 Mobile (${mobileStatus.currentIP || 'USB Tethering'})`;
        } else if (this.useVPN) {
            const vpnStatus = browserVPNService.getStatus();
            connectionInfo = `🛡️ VPN (${vpnStatus.currentServer || 'Auto'})`;
        } else {
            // Random proxy selection (now filters out failing proxies)
            proxy = proxyManager.getRandomProxy();
            proxyConfig = proxyManager.formatForPlaywright(proxy);
            connectionInfo = proxy ? proxy.ip : 'Direct';
        }

        this.broadcastProgress({
            activeThreads: this.activeThreads,
            log: `Cycle ${job.cycle}: Visiting ${job.url} (${this.settings.headless === 'false' ? 'Headful' : 'Headless'}) via ${connectionInfo}`
        });

        const result = await this.activeBrowserService.runVisit(job.url, proxyConfig);

        this.activeThreads--;
        this.totalProcessed++;

        if (result.success) {
            // Mark proxy as working (only in proxy mode)
            if (!this.useVPN && !this.useMobile && proxy) proxyManager.markProxySuccess(proxy);
            this.broadcastProgress({ log: `✓ Success: ${job.url} visited.` });
        } else {
            // Mark proxy as failing if it was used (only in proxy mode)
            if (!this.useVPN && proxy && result.error && (
                result.error.includes('Proxy') || 
                result.error.includes('timeout') || 
                result.error.includes('Connection')
            )) {
                proxyManager.markProxyFailed(proxy);
            }
            this.broadcastProgress({ log: `✗ Failed: ${job.url} - ${result.error}` });
        }

        // Include stats based on mode
        if (this.useMobile) {
            const mobileStatus = browserMobileService.getStatus();
            this.broadcastProgress({
                processed: this.totalProcessed,
                activeThreads: this.activeThreads,
                workingProxies: mobileStatus.connected ? 1 : 0,
                totalProxies: 1,
                mobileIP: mobileStatus.currentIP,
                rotationCount: mobileStatus.rotationCount
            });
        } else if (this.useVPN) {
            const vpnStatus = browserVPNService.getStatus();
            this.broadcastProgress({
                processed: this.totalProcessed,
                activeThreads: this.activeThreads,
                workingProxies: 1,
                totalProxies: 1,
                vpnServer: vpnStatus.currentServer
            });
        } else {
            const proxyStats = proxyManager.getStats();
            this.broadcastProgress({
                processed: this.totalProcessed,
                activeThreads: this.activeThreads,
                workingProxies: proxyStats.available,
                totalProxies: proxyStats.total
            });
        }

        // Trigger next
        setTimeout(() => this.processQueue(), 1000);
    }

    generateUrls(csvData, domain) {
        const urls = [];
        csvData.forEach(row => {
            // Get first value regardless of key
            const cell = Object.values(row)[0];
            if (cell && typeof cell === 'string' && cell.match(/^[B0-9][A-Z0-9]{9}$/)) {
                urls.push(`https://www.${domain}/dp/${cell.trim()}`);
            }
        });
        return urls;
    }

    broadcastStatus(message, state) {
        if (this.io) {
            this.io.emit('status', { message, state });
        }
    }

    broadcastProgress(data) {
        if (this.io) {
            // Calculate percentage
            const jobQueueLength = this.jobQueue ? this.jobQueue.length : 0;
            const activeThreads = data.activeThreads || 0;
            const total = this.totalProcessed + jobQueueLength + activeThreads;

            data.totalProxies = proxyManager.proxies.length;
            data.workingProxies = proxyManager.proxies.length;

            if (total > 0) {
                data.progress = (this.totalProcessed / total) * 100;
            } else {
                data.progress = 0;
            }

            this.io.emit('progress', data);
        }
    }
}

module.exports = new JobManager();
