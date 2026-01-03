# Traffic Generator - Complete Setup Guide

## 🚀 Quick Start (New PC Setup)

### Step 1: Prerequisites
1. **Install Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Choose "LTS" version
   - Install with default settings

2. **Copy the entire folder** to the new PC

### Step 2: Installation
1. **Double-click:** `SETUP_COMPLETE.bat`
2. Wait for installation to complete (5-10 minutes)
3. This will install:
   - Node.js dependencies
   - Chromium browser for automation
   - Cloudflare tunnel (optional)

### Step 3: Run the Server

#### Option A: Local Access (Same PC Only)
- **Double-click:** `Run_Local.bat`
- Open browser: `http://localhost:3000`

#### Option B: Public Access (Access from Anywhere)
- **Double-click:** `Run_Public_Cloudflare.bat`
- Copy the public URL shown (e.g., `https://xxxx.trycloudflare.com`)
- Share this URL to access from any device/location

---

## 🌐 Web Proxy TURBO Mode Features

✅ **No Proxy List Needed** - Uses free web proxy services  
✅ **15 Parallel Visits** - 3 browsers × 5 tabs simultaneously  
✅ **Different IP Per Tab** - Each tab gets unique IP  
✅ **5 Proxy Services** - CroxyProxy, SSLUnblocker, ProxySite, etc.

### How to Use:
1. Upload CSV file with ASINs (product IDs)
2. Check **"🌐 Web Proxy TURBO Mode"**
3. Set **Browsers = 3**, **Tabs/Browser = 5** (or customize)
4. **Uncheck** "Headless Mode" to see browsers
5. Click **"Start Traffic"**

You'll see 3 browser windows open, each with 5 tabs, all visiting different Amazon products with different IPs!

---

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `SETUP_COMPLETE.bat` | First-time installation |
| `Run_Local.bat` | Run server locally (no internet needed) |
| `Run_Public_Cloudflare.bat` | Run with public URL access |
| `server/` | Server code and dependencies |
| `server/proxies.json` | Proxy list (optional, not needed for Web Proxy mode) |

---

## 🔧 Troubleshooting

### "Node.js not found"
- Install Node.js from https://nodejs.org/
- Restart your PC after installation

### "npm install failed"
- Check internet connection
- Run Command Prompt as Administrator
- Try: `npm install --legacy-peer-deps`

### Browsers not opening
- Run `SETUP_COMPLETE.bat` again
- Manually install: `npx playwright install chromium`

### Cloudflare tunnel not working
- Check firewall settings
- Try downloading cloudflared.exe manually from:
  https://github.com/cloudflare/cloudflared/releases

---

## 📊 CSV File Format

Your CSV should have ASINs (Amazon product IDs):

```
B08N5WRWNW
B09G9FPHY6
B0BDJ6KGFP
```

Or with headers:
```
ASIN
B08N5WRWNW
B09G9FPHY6
```

---

## ⚙️ Configuration Options

### Browser Count
- Default: 3 browsers
- Range: 1-5 browsers
- More browsers = faster, but uses more RAM

### Tabs Per Browser
- Default: 5 tabs
- Range: 1-10 tabs per browser
- More tabs = more parallel visits

### Total Capacity
- **Formula:** Browsers × Tabs = Total Parallel Visits
- **Example:** 3 × 5 = 15 simultaneous visits

---

## 🌍 Proxy Services Used

The Web Proxy mode automatically uses these services:
1. CroxyProxy.com
2. SSLUnblocker.com
3. ProxySite.com
4. CroxyProxy.rocks
5. BlockAway.net

Each tab rotates through different services for maximum IP diversity.

---

## 📞 Support

For issues or questions:
1. Check the terminal/console for error messages
2. Make sure all dependencies are installed
3. Try running `SETUP_COMPLETE.bat` again

---

## 🎯 Best Practices

1. **Start Small:** Test with 10-20 ASINs first
2. **Monitor:** Keep an eye on the first batch to ensure it's working
3. **Headless Off:** Initially run with browsers visible to debug
4. **RAM Usage:** Each browser uses ~200-300MB RAM
5. **Network:** Ensure stable internet connection

---

## 🔐 Security Notes

- The server runs locally on your PC
- Cloudflare tunnel is encrypted HTTPS
- No data is stored on external servers
- All traffic routing happens in real-time

---

**Version:** 2.0 - Web Proxy TURBO Mode  
**Last Updated:** January 2026
