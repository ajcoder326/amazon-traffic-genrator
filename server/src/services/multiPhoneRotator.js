/**
 * Multi-Phone IP Rotator via ADB
 * 
 * Manages multiple Android phones connected via USB for:
 * 1. Round-robin phone selection
 * 2. Parallel usage (one browser per phone)
 * 3. IP rotation via Airplane Mode on each phone
 */

const { exec, execSync } = require('child_process');
const https = require('https');

class MultiPhoneRotator {
    constructor() {
        this.devices = []; // Array of connected devices
        this.currentDeviceIndex = 0;
        this.deviceIPs = new Map(); // deviceId -> currentIP
        this.rotationCounts = new Map(); // deviceId -> rotationCount
        this.visitsPerDevice = new Map(); // deviceId -> visitCount
        this.rotateEvery = 10; // Rotate IP after X visits per device
    }

    /**
     * Scan for all connected Android devices
     */
    async scanDevices() {
        return new Promise((resolve) => {
            exec('adb devices', async (error, stdout, stderr) => {
                if (error) {
                    console.log('[MultiPhone] ADB not found. Please install Android Platform Tools.');
                    this.devices = [];
                    resolve([]);
                    return;
                }

                const lines = stdout.trim().split('\n');
                const deviceLines = lines.slice(1).filter(line => line.includes('device') && !line.includes('offline'));
                
                this.devices = [];
                
                for (const line of deviceLines) {
                    const deviceId = line.split('\t')[0].trim();
                    if (deviceId) {
                        const deviceInfo = await this.getDeviceInfo(deviceId);
                        this.devices.push({
                            id: deviceId,
                            ...deviceInfo
                        });
                        this.visitsPerDevice.set(deviceId, 0);
                        this.rotationCounts.set(deviceId, 0);
                    }
                }

                console.log(`[MultiPhone] Found ${this.devices.length} device(s):`);
                this.devices.forEach((d, i) => {
                    console.log(`  ${i + 1}. ${d.model} (${d.carrier}) - ${d.id}`);
                });

                resolve(this.devices);
            });
        });
    }

    /**
     * Get info for a specific device
     */
    async getDeviceInfo(deviceId) {
        try {
            const model = await this.runADB(deviceId, 'shell getprop ro.product.model');
            const carrier = await this.runADB(deviceId, 'shell getprop gsm.operator.alpha');
            const android = await this.runADB(deviceId, 'shell getprop ro.build.version.release');
            
            return {
                model: model.trim() || 'Unknown',
                carrier: carrier.trim() || 'Unknown',
                androidVersion: android.trim() || 'Unknown'
            };
        } catch (e) {
            return { model: 'Unknown', carrier: 'Unknown', androidVersion: 'Unknown' };
        }
    }

    /**
     * Run ADB command on specific device
     */
    async runADB(deviceId, command) {
        return new Promise((resolve, reject) => {
            exec(`adb -s ${deviceId} ${command}`, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve(stdout.trim());
            });
        });
    }

    /**
     * Get current public IP through a specific device's tethering
     * Note: This requires that device to be the active tethering source
     */
    async getPublicIP() {
        return new Promise((resolve) => {
            const options = {
                hostname: 'api.ipify.org',
                path: '/?format=json',
                method: 'GET',
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.ip);
                    } catch (e) {
                        resolve(null);
                    }
                });
            });

            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
            req.end();
        });
    }

    /**
     * Get next device in round-robin fashion
     */
    getNextDevice() {
        if (this.devices.length === 0) return null;
        
        const device = this.devices[this.currentDeviceIndex];
        this.currentDeviceIndex = (this.currentDeviceIndex + 1) % this.devices.length;
        
        return device;
    }

    /**
     * Get device by index
     */
    getDeviceByIndex(index) {
        if (index >= 0 && index < this.devices.length) {
            return this.devices[index];
        }
        return null;
    }

    /**
     * Rotate IP on a specific device
     */
    async rotateIP(deviceId) {
        console.log(`[MultiPhone] Rotating IP on device: ${deviceId}`);

        try {
            // Enable Airplane Mode
            try {
                await this.runADB(deviceId, 'shell cmd connectivity airplane-mode enable');
            } catch (e) {
                await this.runADB(deviceId, 'shell settings put global airplane_mode_on 1');
                await this.runADB(deviceId, 'shell am broadcast -a android.intent.action.AIRPLANE_MODE');
            }
            console.log(`[MultiPhone] [${deviceId}] Airplane: ON`);

            await this.sleep(3000);

            // Disable Airplane Mode
            try {
                await this.runADB(deviceId, 'shell cmd connectivity airplane-mode disable');
            } catch (e) {
                await this.runADB(deviceId, 'shell settings put global airplane_mode_on 0');
                await this.runADB(deviceId, 'shell am broadcast -a android.intent.action.AIRPLANE_MODE');
            }
            console.log(`[MultiPhone] [${deviceId}] Airplane: OFF`);

            await this.sleep(5000);

            // Update rotation count
            const count = (this.rotationCounts.get(deviceId) || 0) + 1;
            this.rotationCounts.set(deviceId, count);
            
            // Reset visit count
            this.visitsPerDevice.set(deviceId, 0);

            console.log(`[MultiPhone] [${deviceId}] IP rotated (rotation #${count})`);

            return { success: true, deviceId, rotationCount: count };

        } catch (error) {
            console.error(`[MultiPhone] Error rotating ${deviceId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Rotate all devices simultaneously (for fresh start)
     */
    async rotateAllDevices() {
        console.log('[MultiPhone] Rotating ALL devices...');
        
        const promises = this.devices.map(device => this.rotateIP(device.id));
        const results = await Promise.all(promises);
        
        return results;
    }

    /**
     * Switch active tethering to a specific device
     * Note: On Windows, you may need to disable other adapters
     */
    async switchToDevice(deviceId) {
        console.log(`[MultiPhone] Switching to device: ${deviceId}`);
        
        // Enable USB tethering on the target device
        try {
            // This command may require root on some devices
            await this.runADB(deviceId, 'shell svc usb setFunctions rndis');
            console.log(`[MultiPhone] USB tethering enabled on ${deviceId}`);
        } catch (e) {
            console.log(`[MultiPhone] Auto-enable failed. Please enable USB tethering manually on ${deviceId}`);
        }

        // Wait for network to be ready
        await this.sleep(3000);

        // Verify connection
        const ip = await this.getPublicIP();
        if (ip) {
            this.deviceIPs.set(deviceId, ip);
            console.log(`[MultiPhone] Connected via ${deviceId}, IP: ${ip}`);
        }

        return ip;
    }

    /**
     * Increment visit count for a device
     */
    incrementVisits(deviceId) {
        const current = this.visitsPerDevice.get(deviceId) || 0;
        this.visitsPerDevice.set(deviceId, current + 1);
        return current + 1;
    }

    /**
     * Check if device needs rotation
     */
    needsRotation(deviceId) {
        const visits = this.visitsPerDevice.get(deviceId) || 0;
        return visits >= this.rotateEvery;
    }

    /**
     * Set rotation frequency
     */
    setRotateEvery(count) {
        this.rotateEvery = count;
        console.log(`[MultiPhone] Will rotate IP every ${count} visits per device`);
    }

    /**
     * Get status summary
     */
    getStatus() {
        return {
            totalDevices: this.devices.length,
            devices: this.devices.map(d => ({
                id: d.id,
                model: d.model,
                carrier: d.carrier,
                visits: this.visitsPerDevice.get(d.id) || 0,
                rotations: this.rotationCounts.get(d.id) || 0,
                currentIP: this.deviceIPs.get(d.id) || 'Unknown'
            })),
            currentDeviceIndex: this.currentDeviceIndex,
            rotateEvery: this.rotateEvery
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new MultiPhoneRotator();
