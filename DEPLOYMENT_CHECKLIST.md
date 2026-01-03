# 📦 DEPLOYMENT CHECKLIST - New PC Setup

## ✅ Pre-Deployment Checklist

### System Requirements
- [ ] Windows 10/11 (64-bit)
- [ ] 8GB RAM minimum (16GB recommended)
- [ ] 5GB free disk space
- [ ] Internet connection
- [ ] Administrator access

---

## 📥 Step 1: Transfer Files

### Option A: Copy Entire Folder
```
Copy the entire "traffic-generator" folder to the new PC
Location: C:\Users\[Username]\Downloads\traffic-generator
```

### Option B: Git Clone (if using GitHub)
```bash
git clone [your-repo-url] traffic-generator
cd traffic-generator
```

---

## 🔧 Step 2: Install Prerequisites

### Install Node.js
1. [ ] Download from: https://nodejs.org/
2. [ ] Version: 18.x LTS or higher
3. [ ] Run installer with default settings
4. [ ] Verify installation:
   ```bash
   node --version
   npm --version
   ```
5. [ ] Restart PC

---

## 🚀 Step 3: Run Installation

### Run Setup Script
1. [ ] Navigate to traffic-generator folder
2. [ ] Double-click: **SETUP_COMPLETE.bat**
3. [ ] Wait for completion (5-10 minutes)
4. [ ] Check for errors in the window

### What Gets Installed:
- [x] Node.js dependencies (Express, Socket.io, Playwright, etc.)
- [x] Chromium browser (for automation)
- [x] Playwright system dependencies
- [x] Cloudflare tunnel binary (optional)

---

## 🧪 Step 4: Test Installation

### Test Local Server
1. [ ] Double-click: **Run_Local.bat**
2. [ ] Browser opens to http://localhost:3000
3. [ ] Interface loads correctly
4. [ ] No errors in console

### Test File Upload
1. [ ] Create test CSV with 5 ASINs
2. [ ] Upload CSV file
3. [ ] Check status shows "CSV Loaded"

### Test Web Proxy Mode
1. [ ] Check "🌐 Web Proxy TURBO Mode"
2. [ ] Set Browsers = 2, Tabs = 3
3. [ ] Uncheck "Headless Mode"
4. [ ] Click "Start Traffic"
5. [ ] Verify 2 browser windows open
6. [ ] Verify each browser has 3 tabs
7. [ ] Check logs show [B1-T1], [B2-T1] etc.

---

## 🌍 Step 5: Test Cloudflare Tunnel (Optional)

### Public Access Setup
1. [ ] Close local server
2. [ ] Double-click: **Run_Public_Cloudflare.bat**
3. [ ] Wait for Cloudflare URL
4. [ ] Copy the public URL (https://xxxx.trycloudflare.com)
5. [ ] Test URL from different device/network
6. [ ] Verify full functionality

---

## 📊 Step 6: Production Configuration

### Performance Settings
- [ ] Set Browsers = 3
- [ ] Set Tabs/Browser = 5
- [ ] Total capacity = 15 parallel visits
- [ ] Adjust based on RAM availability

### CSV File Preparation
- [ ] Format: One ASIN per line
- [ ] Remove headers if present
- [ ] Test with small batch first (10-20 ASINs)
- [ ] Verify all ASINs are valid

---

## 🔐 Step 7: Security & Firewall

### Windows Firewall
- [ ] Allow Node.js through firewall
- [ ] Allow Cloudflare tunnel (if using)
- [ ] Port 3000 open locally

### Cloudflare Tunnel Security
- [ ] URL is temporary (changes on restart)
- [ ] HTTPS encryption enabled
- [ ] No permanent exposure

---

## 📝 Step 8: Documentation

### Keep These Files
- [ ] INSTALLATION_GUIDE.md
- [ ] QUICK_START_GUIDE.html (open in browser)
- [ ] This checklist (DEPLOYMENT_CHECKLIST.md)

### User Training
- [ ] Show how to upload CSV
- [ ] Explain Web Proxy TURBO mode
- [ ] Demonstrate browser/tab settings
- [ ] Show how to read logs

---

## 🆘 Troubleshooting Guide

### Common Issues

#### "Node.js not found"
```
Solution: Install Node.js from nodejs.org
Action: Restart PC after installation
```

#### "npm install failed"
```
Solution 1: Check internet connection
Solution 2: Run as Administrator
Solution 3: npm install --legacy-peer-deps
```

#### Browsers not opening
```
Solution: Run SETUP_COMPLETE.bat again
Manual: npx playwright install chromium
```

#### Port 3000 already in use
```
Solution: Close existing Node.js processes
Command: taskkill /F /IM node.exe
```

#### Cloudflare tunnel won't start
```
Solution 1: Check firewall settings
Solution 2: Download cloudflared.exe manually
URL: github.com/cloudflare/cloudflared/releases
```

---

## ✅ Final Verification

### Smoke Test
- [ ] Upload real CSV (10 ASINs)
- [ ] Enable Web Proxy TURBO mode
- [ ] Start traffic generation
- [ ] Verify all browsers open
- [ ] Verify tabs are visiting sites
- [ ] Check success rate in logs
- [ ] Confirm different proxy services used
- [ ] Wait for completion
- [ ] Review results

### Performance Check
- [ ] Monitor CPU usage (should be reasonable)
- [ ] Monitor RAM usage (200-300MB per browser)
- [ ] Monitor network traffic
- [ ] Check for errors in console

---

## 📞 Support Contacts

### Technical Issues
- Check console/terminal for error messages
- Review logs in server folder
- Re-run SETUP_COMPLETE.bat

### Resources
- Node.js: https://nodejs.org/
- Playwright: https://playwright.dev/
- Cloudflare: https://developers.cloudflare.com/

---

## 🎯 Success Criteria

✅ Node.js installed and verified
✅ All dependencies installed successfully  
✅ Local server starts without errors
✅ CSV upload works
✅ Web Proxy mode opens multiple browsers
✅ Tabs open in each browser
✅ Amazon pages load through proxies
✅ Different IPs confirmed per tab
✅ Cloudflare tunnel works (if needed)
✅ User can operate independently

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**PC Name/ID:** _____________  
**Status:** [ ] Success [ ] Issues (describe below)

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________
