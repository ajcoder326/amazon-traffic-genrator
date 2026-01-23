# 🚀 Git Deployment Guide

## For Repository Owner (You)

### 1. Create GitHub Repository
```bash
# Go to GitHub.com
# Click "New Repository"
# Name: traffic-generator (or your choice)
# Keep it Private or Public
# DON'T initialize with README (we already have one)
```

### 2. Push to GitHub
```bash
cd c:\Users\dj\Downloads\traffic-generator\deploy

# Configure Git (first time only)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Commit all files
git commit -m "Initial commit - Traffic Generator v2.0 - Web Proxy TURBO Mode"

# Add remote repository (replace with YOUR GitHub URL)
git remote add origin https://github.com/YOUR-USERNAME/traffic-generator.git

# Push to GitHub
git push -u origin master
```

### 3. Share Repository URL
Share this URL with your team:
```
https://github.com/YOUR-USERNAME/traffic-generator
```

---

## For Team Members (Target PC)

### 1. Install Prerequisites
```bash
# Install Node.js from nodejs.org
# Version 18 or higher (LTS recommended)
# Restart PC after installation
```

### 2. Clone Repository
```bash
# Open PowerShell or Command Prompt
# Navigate to desired location
cd C:\Users\[YourName]\Downloads

# Clone the repository (replace with actual URL)
git clone https://github.com/YOUR-USERNAME/traffic-generator.git

# Navigate to folder
cd traffic-generator
```

### 3. Run Setup
```bash
# Double-click: SETUP_COMPLETE.bat
# OR run from terminal:
.\SETUP_COMPLETE.bat

# Wait 5-10 minutes for installation
```

### 4. Start Using
```bash
# Double-click: START_HERE.bat
# Choose option [2] for Local
# OR option [3] for Public (Cloudflare)
```

---

## Update Process

### For Repository Owner (Push Updates)
```bash
cd c:\Users\dj\Downloads\traffic-generator\deploy

# Make your changes
# Then commit and push:
git add .
git commit -m "Description of changes"
git push
```

### For Team Members (Pull Updates)
```bash
cd C:\Users\[YourName]\Downloads\traffic-generator

# Pull latest changes
git pull

# If dependencies changed, re-run setup:
.\SETUP_COMPLETE.bat
```

---

## Alternative: Direct Download (No Git)

If Git is not available on target PC:

### 1. Download ZIP
```
# On GitHub repository page:
Click "Code" button → "Download ZIP"
Extract to desired location
```

### 2. Install and Run
```
Same as steps 1, 3, 4 above
```

---

## 📦 What Gets Deployed

### Included in Repository:
- ✅ All .bat files (setup, run, etc.)
- ✅ All documentation (.md, .html)
- ✅ Server source code (server/src/)
- ✅ package.json (dependencies list)
- ✅ Configuration files

### NOT Included (Auto-Generated):
- ❌ node_modules/ (installed by npm)
- ❌ cloudflared.exe (downloaded by setup)
- ❌ Chromium browser (installed by Playwright)
- ❌ Upload files (.csv)
- ❌ Log files

This keeps the repository small and clean!

---

## 🔐 Security Notes

### Private Repository
```
# If your repo is private:
Team members need GitHub access
Use HTTPS or SSH authentication
```

### Public Repository
```
# If public:
No authentication needed
Anyone can clone
Be careful not to commit sensitive data
```

### What NOT to Commit
- ❌ CSV files with real data
- ❌ API keys or passwords
- ❌ Personal information
- ❌ Large binary files

All these are already in .gitignore!

---

## 📊 File Size

```
Repository size: ~500KB (source code only)
After npm install: ~500MB (with dependencies)
After Playwright: ~700MB (with browsers)
```

---

## ✅ Verification Checklist

### On Target PC After Clone:
- [ ] Node.js installed (check: `node --version`)
- [ ] Repository cloned successfully
- [ ] SETUP_COMPLETE.bat runs without errors
- [ ] All dependencies installed
- [ ] Chromium browser downloaded
- [ ] Local server starts (Run_Local.bat)
- [ ] Web interface loads at http://localhost:3000
- [ ] CSV upload works
- [ ] Web Proxy mode opens 3 browsers
- [ ] All 15 tabs open successfully

---

## 🆘 Common Issues

### "Git not found"
```bash
# Install Git from: https://git-scm.com/
# OR download ZIP instead (no Git needed)
```

### "Permission denied"
```bash
# Run PowerShell as Administrator
# OR check GitHub authentication
```

### "Package not found"
```bash
# Internet connection issue
# Try: npm install --legacy-peer-deps
```

---

## 📞 Support Flow

```
1. Team member has issue
   ↓
2. Check terminal/console output
   ↓
3. Review INSTALLATION_GUIDE.md
   ↓
4. Re-run SETUP_COMPLETE.bat
   ↓
5. If still fails, contact repository owner
```

---

**Ready to Deploy!** 🎉

Just create the GitHub repo, push, and share the URL with your team!
