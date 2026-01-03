const fs = require('fs');

class ProxyManager {
    constructor() {
        this.proxies = [];
        this.currentIndex = 0;
        this.failedProxies = new Map(); // Track failed proxies: ip -> { count, lastFailTime }
        this.FAIL_THRESHOLD = 3; // Mark as bad after 3 failures
        this.RETRY_AFTER_MS = 5 * 60 * 1000; // Retry bad proxies after 5 minutes

        // Auto-load default proxies if available
        const defaultPath = require('path').join(__dirname, '../../proxies.json');
        this.loadProxies(defaultPath);
    }

    loadProxies(filePath) {
        try {
            if (!filePath || !fs.existsSync(filePath)) {
                // console.log('No proxy file provided or file not found.'); 
                // distinct log to avoid spamming if file missing
                return 0;
            }
            const data = fs.readFileSync(filePath, 'utf8');
            const json = JSON.parse(data);

            if (Array.isArray(json)) {
                this.proxies = json.filter(p => p.ip && p.port);
                this.failedProxies.clear(); // Reset failures on new load
                console.log(`Loaded ${this.proxies.length} proxies from ${filePath}`);
            }
            return this.proxies.length;
        } catch (error) {
            console.error('Error loading proxies:', error);
            return 0;
        }
    }

    getRandomProxy() {
        if (this.proxies.length === 0) return null;
        
        // Filter out currently failing proxies
        const now = Date.now();
        const availableProxies = this.proxies.filter(p => {
            const failInfo = this.failedProxies.get(p.ip);
            if (!failInfo) return true;
            
            // Allow retry after timeout
            if (now - failInfo.lastFailTime > this.RETRY_AFTER_MS) {
                this.failedProxies.delete(p.ip);
                return true;
            }
            
            // Skip if over threshold
            return failInfo.count < this.FAIL_THRESHOLD;
        });
        
        if (availableProxies.length === 0) {
            console.log('[ProxyManager] All proxies are currently failing, resetting...');
            this.failedProxies.clear();
            const randomIndex = Math.floor(Math.random() * this.proxies.length);
            return this.proxies[randomIndex];
        }
        
        const randomIndex = Math.floor(Math.random() * availableProxies.length);
        return availableProxies[randomIndex];
    }

    // Call this when a proxy fails
    markProxyFailed(proxy) {
        if (!proxy || !proxy.ip) return;
        
        const existing = this.failedProxies.get(proxy.ip) || { count: 0, lastFailTime: 0 };
        existing.count++;
        existing.lastFailTime = Date.now();
        this.failedProxies.set(proxy.ip, existing);
        
        if (existing.count >= this.FAIL_THRESHOLD) {
            console.log(`[ProxyManager] Proxy ${proxy.ip} marked as failing (${existing.count} failures)`);
        }
    }

    // Call this when a proxy succeeds to reset its failure count
    markProxySuccess(proxy) {
        if (!proxy || !proxy.ip) return;
        this.failedProxies.delete(proxy.ip);
    }

    getNextProxy() {
        // Fallback or Sequential if needed, but we use random now
        return this.getRandomProxy();
    }

    // specific method to format for Playwright
    formatForPlaywright(proxy) {
        if (!proxy) return null;

        // Playwright expects http://ip:port
        const url = `http://${proxy.ip}:${proxy.port}`;
        return {
            server: url,
            username: proxy.user || proxy.username,
            password: proxy.pass || proxy.password
        };
    }
    
    // Get stats about proxy health
    getStats() {
        const failingCount = Array.from(this.failedProxies.values())
            .filter(f => f.count >= this.FAIL_THRESHOLD).length;
        return {
            total: this.proxies.length,
            failing: failingCount,
            available: this.proxies.length - failingCount
        };
    }
}

module.exports = new ProxyManager();
