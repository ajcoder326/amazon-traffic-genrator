# 🚀 TEAM DEPLOYMENT INSTRUCTIONS

## For Team Members on Target PC

### Step 1: Install Node.js
1. Download from: https://nodejs.org/
2. Choose **LTS version** (v20.x or v18.x)
3. Install with default settings
4. **Restart your PC**

### Step 2: Clone Repository
```bash
# Open PowerShell or Command Prompt
# Navigate to your desired location
cd C:\Users\[YourName]\Downloads

# Clone the repository
git clone https://github.com/ajcoder326/amazon-traffic-genrator.git

# Enter the directory
cd amazon-traffic-genrator
```

### Step 3: Run Setup (First Time Only)
```bash
# Double-click this file in Explorer:
SETUP_COMPLETE.bat

# OR run from terminal:
.\SETUP_COMPLETE.bat

# Wait 5-10 minutes for installation
```

### Step 4: Start Using
```bash
# Double-click this file:
START_HERE.bat

# Choose option:
[2] Local Access (http://localhost:3000)
[3] Public Access (Cloudflare tunnel)
```

---

## 📖 Documentation

Open these files for detailed help:
- **QUICK_START_GUIDE.html** - Visual guide (open in browser)
- **INSTALLATION_GUIDE.md** - Complete installation steps
- **DEPLOYMENT_CHECKLIST.md** - Deployment verification

---

## ⚡ Quick Reference

### Local Server
```bash
.\Run_Local.bat
# Access: http://localhost:3000
```

### Public Server (Cloudflare)
```bash
.\Run_Public_Cloudflare.bat
# Get public URL: https://xxxx.trycloudflare.com
```

---

## 🌐 Web Proxy TURBO Mode Features

✅ **3 Browsers × 5 Tabs = 15 Parallel Visits**  
✅ **5 Different Proxy Services**  
✅ **Different IP Per Tab**  
✅ **No Proxy List Needed!**

### How to Use:
1. Upload CSV with Amazon ASINs
2. Check "🌐 Web Proxy TURBO Mode"
3. Set: Browsers = 3, Tabs = 5
4. Uncheck "Headless Mode" (to see browsers)
5. Click "Start Traffic"

You'll see 3 browser windows open, each with 5 tabs!

---

## 🆘 Troubleshooting

### "Node.js not found"
```
Install Node.js from nodejs.org
Restart PC
```

### "Git not found"
```
Download repository as ZIP instead:
https://github.com/ajcoder326/amazon-traffic-genrator
Click "Code" → "Download ZIP"
```

### "npm install failed"
```
Check internet connection
Run PowerShell as Administrator
Try: npm install --legacy-peer-deps
```

### "Port 3000 in use"
```
Use START_HERE.bat option [7]
Kill all Node processes
```

---

## 📞 Need Help?

1. Check console/terminal for errors
2. Review documentation files
3. Re-run SETUP_COMPLETE.bat
4. Contact repository owner

---

## 🔄 Get Updates

```bash
cd amazon-traffic-genrator
git pull
# If dependencies changed:
.\SETUP_COMPLETE.bat
```

---

**Repository:** https://github.com/ajcoder326/amazon-traffic-genrator  
**Version:** 2.0 - Web Proxy TURBO Mode  
**Status:** ✅ Ready to Use
