# 🔄 Update Workflow Guide

## For Repository Owner (You)

### When You Make Changes

#### Option 1: Use Batch File (Easy)
```bash
# From traffic-generator folder:
Double-click: PUSH_UPDATE.bat

# Enter commit message
# Press Enter
# Done!
```

#### Option 2: Manual Commands
```bash
cd c:\Users\dj\Downloads\traffic-generator\deploy

# Check what changed
git status

# Add all changes
git add .

# Commit changes
git commit -m "Description of your changes"

# Push to GitHub
git push
```

---

## For Team Members (Target PC)

### When Updates Are Available

#### Option 1: Use Batch File (Easy)
```bash
# From amazon-traffic-genrator folder:
Double-click: PULL_UPDATE.bat

# Updates will download automatically
```

#### Option 2: Manual Commands
```bash
cd C:\Users\[YourName]\Downloads\amazon-traffic-genrator

# Pull latest changes
git pull

# If dependencies changed, re-run:
.\SETUP_COMPLETE.bat
```

---

## 📋 Common Update Scenarios

### 1. Code Changes Only
**Owner:**
```bash
# Make your changes in files
.\PUSH_UPDATE.bat
```

**Team:**
```bash
.\PULL_UPDATE.bat
# Restart server if running
```

### 2. New Dependencies Added (package.json changed)
**Owner:**
```bash
# Update package.json
.\PUSH_UPDATE.bat
```

**Team:**
```bash
.\PULL_UPDATE.bat
.\SETUP_COMPLETE.bat  # Re-install dependencies
```

### 3. New Files Added
**Owner:**
```bash
# Add new files
.\PUSH_UPDATE.bat
```

**Team:**
```bash
.\PULL_UPDATE.bat
# New files automatically downloaded
```

---

## 🔍 Check for Updates

### Team Members
```bash
cd amazon-traffic-genrator

# Check if updates available
git fetch
git status

# If behind, pull updates:
git pull
```

---

## ⚡ Quick Reference

| Action | Owner | Team Member |
|--------|-------|-------------|
| **Push changes** | `PUSH_UPDATE.bat` | N/A |
| **Pull changes** | N/A | `PULL_UPDATE.bat` |
| **Check status** | `git status` | `git status` |
| **View history** | `git log` | `git log` |

---

## 🚨 Troubleshooting

### "You have uncommitted changes"
```bash
# Save your local changes first
git stash
git pull
git stash pop
```

### "Merge conflict"
```bash
# Option 1: Keep remote version
git reset --hard origin/main
git pull

# Option 2: Keep your version
# Manually edit conflicted files
git add .
git commit -m "Resolved conflicts"
```

### "Push rejected"
```bash
# Pull first, then push
git pull
git push
```

---

## 📊 Update Notifications

### For Team Members

**Check for updates regularly:**
```bash
# Daily or weekly
git fetch
git status

# If updates found:
git pull
```

**Or set up notifications:**
- Enable GitHub notifications
- Watch repository on GitHub
- Check repository page: https://github.com/ajcoder326/amazon-traffic-genrator

---

## 🎯 Best Practices

### For Owner
- ✅ Commit small, logical changes
- ✅ Write clear commit messages
- ✅ Test before pushing
- ✅ Notify team of major changes

### For Team
- ✅ Pull updates before starting work
- ✅ Don't modify code (clone only)
- ✅ If modified, stash before pull
- ✅ Re-run setup if dependencies change

---

## 📞 Quick Commands

### Owner (Push)
```bash
cd c:\Users\dj\Downloads\traffic-generator\deploy
git add .
git commit -m "Update message"
git push
```

### Team (Pull)
```bash
cd amazon-traffic-genrator
git pull
```

**Simple as that!** 🚀
