/**
 * Free Proxy List Fetcher
 * Gets working free proxies from public sources
 */

const https = require('https');
const http = require('http');

class FreeProxyFetcher {
    constructor() {
        this.proxies = [];
        this.workingProxies = [];
        this.currentIndex = 0;
    }

    /**
     * Fetch free proxies from multiple sources
     */
    async fetchProxies() {
        console.log('[FreeProxy] Fetching free proxies...');
        
        const sources = [
            this.fetchFromProxyScrape(),
            this.fetchFromGeonode(),
            this.fetchFromProxyList()
        ];

        try {
            const results = await Promise.allSettled(sources);
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    this.proxies.push(...result.value);
                }
            });

            // Remove duplicates
            this.proxies = [...new Set(this.proxies)];
            
            console.log(`[FreeProxy] Fetched ${this.proxies.length} proxies`);
            
            return this.proxies;
        } catch (error) {
            console.error('[FreeProxy] Error fetching proxies:', error.message);
            return [];
        }
    }

    /**
     * ProxyScrape API
     */
    async fetchFromProxyScrape() {
        return new Promise((resolve) => {
            const url = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all';
            
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const proxies = data.trim().split('\n')
                        .filter(line => line.includes(':'))
                        .map(line => {
                            const [host, port] = line.trim().split(':');
                            return { host, port: parseInt(port), source: 'proxyscrape' };
                        });
                    console.log(`[ProxyScrape] Found ${proxies.length} proxies`);
                    resolve(proxies);
                });
            }).on('error', () => resolve([]));
        });
    }

    /**
     * Geonode API
     */
    async fetchFromGeonode() {
        return new Promise((resolve) => {
            const url = 'https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc';
            
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        const proxies = (json.data || []).map(p => ({
                            host: p.ip,
                            port: parseInt(p.port),
                            protocol: p.protocols?.[0] || 'http',
                            country: p.country,
                            source: 'geonode'
                        }));
                        console.log(`[Geonode] Found ${proxies.length} proxies`);
                        resolve(proxies);
                    } catch (e) {
                        resolve([]);
                    }
                });
            }).on('error', () => resolve([]));
        });
    }

    /**
     * Free Proxy List
     */
    async fetchFromProxyList() {
        return new Promise((resolve) => {
            // Using a simple proxy list
            const proxies = [
                // These are example proxies - they may not work
                { host: '103.152.112.162', port: 80, country: 'IN', source: 'static' },
                { host: '103.83.232.222', port: 80, country: 'IN', source: 'static' },
                { host: '47.74.152.29', port: 8888, country: 'SG', source: 'static' },
            ];
            resolve(proxies);
        });
    }

    /**
     * Test if a proxy is working
     */
    async testProxy(proxy, timeout = 10000) {
        return new Promise((resolve) => {
            const options = {
                host: proxy.host,
                port: proxy.port,
                path: 'http://api.ipify.org/?format=json',
                method: 'GET',
                timeout: timeout,
                headers: {
                    'Host': 'api.ipify.org'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.ip && json.ip !== proxy.host) {
                            resolve({ ...proxy, ip: json.ip, working: true });
                        } else {
                            resolve({ ...proxy, working: false });
                        }
                    } catch (e) {
                        resolve({ ...proxy, working: false });
                    }
                });
            });

            req.on('error', () => resolve({ ...proxy, working: false }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ ...proxy, working: false });
            });

            req.end();
        });
    }

    /**
     * Find working proxies
     */
    async findWorkingProxies(count = 10) {
        console.log(`[FreeProxy] Testing proxies to find ${count} working ones...`);
        
        if (this.proxies.length === 0) {
            await this.fetchProxies();
        }

        this.workingProxies = [];
        
        // Test in batches
        const batchSize = 20;
        for (let i = 0; i < this.proxies.length && this.workingProxies.length < count; i += batchSize) {
            const batch = this.proxies.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(p => this.testProxy(p)));
            
            const working = results.filter(p => p.working);
            this.workingProxies.push(...working);
            
            console.log(`[FreeProxy] Tested ${i + batch.length}/${this.proxies.length}, found ${this.workingProxies.length} working`);
        }

        console.log(`[FreeProxy] Found ${this.workingProxies.length} working proxies`);
        return this.workingProxies;
    }

    /**
     * Get next working proxy
     */
    getNextProxy() {
        if (this.workingProxies.length === 0) return null;
        
        const proxy = this.workingProxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.workingProxies.length;
        
        return proxy;
    }

    /**
     * Get proxy URL for Playwright
     */
    getProxyUrl(proxy) {
        return `http://${proxy.host}:${proxy.port}`;
    }
}

module.exports = new FreeProxyFetcher();
