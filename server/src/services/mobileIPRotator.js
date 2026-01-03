/**
 * Mobile IP Rotator via ADB (USB Debugging)
 * 
 * Uses connected Android phone to rotate IP addresses
 * by toggling Airplane Mode via ADB commands.
 * 
 * Requirements:
 * 1. Android phone with USB Debugging enabled
 * 2. ADB installed on PC (added to PATH)
 * 3. USB Tethering enabled on phone
 * 4. Phone connected via USB cable
 */

const { exec, execSync } = require('child_process');
const https = require('https');
const http = require('http');

class MobileIPRotator {
    constructor() {
        this.isConnected = false;
        this.deviceId = null;
        this.currentIP = null;
        this.rotationCount = 0;
        this.lastRotation = null;
    }

    /**
     * Check if ADB is installed and phone is connected
     */
    async checkConnection() {
        return new Promise((resolve) => {
            exec('adb devices', (error, stdout, stderr) => {
                if (error) {
                    console.log('[ADB] ADB not found. Please install Android Platform Tools.');
                    console.log('[ADB] Download: https://developer.android.com/tools/releases/platform-tools');
                    this.isConnected = false;
                    resolve(false);
                    return;
                }

                const lines = stdout.trim().split('\n');
                // First line is "List of devices attached"
                const devices = lines.slice(1).filter(line => line.includes('device'));
                
                if (devices.length === 0) {
                    console.log('[ADB] No devices connected. Please:');
                    console.log('[ADB] 1. Enable USB Debugging on phone');
                    console.log('[ADB] 2. Connect phone via USB');
                    console.log('[ADB] 3. Accept USB debugging prompt on phone');
                    this.isConnected = false;
                    resolve(false);
                    return;
                }

                this.deviceId = devices[0].split('\t')[0];
                this.isConnected = true;
                console.log(`[ADB] ✓ Device connected: ${this.deviceId}`);
                resolve(true);
            });
        });
    }

    /**
     * Get current public IP address
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
            req.on('timeout', () => {
                req.destroy();
                resolve(null);
            });

            req.end();
        });
    }

    /**
     * Execute ADB command
     */
    async runADBCommand(command) {
        return new Promise((resolve, reject) => {
            const fullCommand = this.deviceId 
                ? `adb -s ${this.deviceId} ${command}`
                : `adb ${command}`;
            
            exec(fullCommand, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout.trim());
            });
        });
    }

    /**
     * Toggle Airplane Mode to get new IP
     */
    async rotateIP() {
        if (!this.isConnected) {
            const connected = await this.checkConnection();
            if (!connected) {
                return { success: false, error: 'Phone not connected via USB' };
            }
        }

        const oldIP = await this.getPublicIP();
        console.log(`[ADB] Current IP: ${oldIP}`);
        console.log('[ADB] Rotating IP via Airplane Mode...');

        try {
            // Method 1: Modern Android (Android 7+)
            try {
                await this.runADBCommand('shell cmd connectivity airplane-mode enable');
                console.log('[ADB] Airplane mode: ON');
            } catch (e) {
                // Method 2: Older Android or alternative
                await this.runADBCommand('shell settings put global airplane_mode_on 1');
                await this.runADBCommand('shell am broadcast -a android.intent.action.AIRPLANE_MODE');
                console.log('[ADB] Airplane mode: ON (legacy method)');
            }

            // Wait for network to fully disconnect
            await this.sleep(3000);

            // Disable Airplane Mode
            try {
                await this.runADBCommand('shell cmd connectivity airplane-mode disable');
                console.log('[ADB] Airplane mode: OFF');
            } catch (e) {
                await this.runADBCommand('shell settings put global airplane_mode_on 0');
                await this.runADBCommand('shell am broadcast -a android.intent.action.AIRPLANE_MODE');
                console.log('[ADB] Airplane mode: OFF (legacy method)');
            }

            // Wait for network to reconnect
            console.log('[ADB] Waiting for network reconnection...');
            await this.sleep(5000);

            // Verify new IP
            let newIP = null;
            let attempts = 0;
            while (!newIP && attempts < 5) {
                await this.sleep(2000);
                newIP = await this.getPublicIP();
                attempts++;
            }

            if (!newIP) {
                return { success: false, error: 'Failed to get new IP after rotation' };
            }

            this.currentIP = newIP;
            this.rotationCount++;
            this.lastRotation = new Date();

            const changed = oldIP !== newIP;
            console.log(`[ADB] ${changed ? '✓' : '⚠'} New IP: ${newIP} ${changed ? '(CHANGED!)' : '(same)'}`);

            return {
                success: true,
                oldIP: oldIP,
                newIP: newIP,
                changed: changed,
                rotationCount: this.rotationCount
            };

        } catch (error) {
            console.error('[ADB] Error rotating IP:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Alternative: Toggle Mobile Data (doesn't disconnect WiFi calling etc.)
     */
    async toggleMobileData() {
        try {
            // Disable mobile data
            await this.runADBCommand('shell svc data disable');
            console.log('[ADB] Mobile data: OFF');
            
            await this.sleep(3000);
            
            // Enable mobile data
            await this.runADBCommand('shell svc data enable');
            console.log('[ADB] Mobile data: ON');
            
            await this.sleep(5000);
            
            const newIP = await this.getPublicIP();
            console.log(`[ADB] New IP: ${newIP}`);
            
            return { success: true, newIP };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get device info
     */
    async getDeviceInfo() {
        if (!this.isConnected) {
            await this.checkConnection();
        }

        if (!this.isConnected) {
            return null;
        }

        try {
            const model = await this.runADBCommand('shell getprop ro.product.model');
            const android = await this.runADBCommand('shell getprop ro.build.version.release');
            const carrier = await this.runADBCommand('shell getprop gsm.operator.alpha');

            return {
                deviceId: this.deviceId,
                model: model,
                androidVersion: android,
                carrier: carrier,
                currentIP: this.currentIP || await this.getPublicIP()
            };
        } catch (error) {
            return { deviceId: this.deviceId, error: error.message };
        }
    }

    /**
     * Check if USB Tethering is active
     */
    async checkUSBTethering() {
        // This is tricky to detect programmatically
        // Best way is to check if we can reach internet through USB interface
        const ip = await this.getPublicIP();
        return ip !== null;
    }

    /**
     * Get status for UI
     */
    getStatus() {
        return {
            connected: this.isConnected,
            deviceId: this.deviceId,
            currentIP: this.currentIP,
            rotationCount: this.rotationCount,
            lastRotation: this.lastRotation
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new MobileIPRotator();
