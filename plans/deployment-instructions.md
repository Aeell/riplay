# RIPlay Deployment Instructions

## Quick Deployment Guide

Since your VPS is already configured, follow these steps to deploy the latest changes.

---

## Step 1: Commit and Push from Local Machine

First, commit all the recent changes from your local development machine:

```bash
# Navigate to project directory
cd c:/develop/riplay

# Check what has changed
git status

# Add all changes
git add -A

# Commit with descriptive message
git commit -m "feat: Complete website restructure with agentic AI direction, cookie consent, and GA4"

# Push to GitHub
git push origin main
```

---

## Step 2: SSH into Your VPS

```bash
ssh your-user@135.125.131.4
```

Replace `your-user` with your actual VPS username.

---

## Step 3: Navigate to Repository and Pull

```bash
# Navigate to the repository (adjust path if different)
cd /var/www/riplay

# Pull latest changes from GitHub
git pull origin main
```

---

## Step 4: Build the Converter

```bash
# Navigate to converter directory
cd tools/converter

# Install/update dependencies
npm install

# Build for production
npm run build

# Generate cache file
node buildCache.js dist/cache.json
```

---

## Step 5: Set Permissions

```bash
# Set proper ownership for nginx
sudo chown -R www-data:www-data /var/www/riplay

# Set proper permissions
sudo find /var/www/riplay -type d -exec chmod 755 {} \;
sudo find /var/www/riplay -type f -exec chmod 644 {} \;
```

---

## Step 6: Verify nginx Configuration

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

---

## Step 7: Verify Deployment

Open your browser and check:

1. **Main site (Czech):** https://riplay.cz/
2. **English version:** https://riplay.cz/en.html
3. **German version:** https://riplay.cz/de.html
4. **GoogleFont2SVG:** https://riplay.cz/tools/googlefont2svg/
5. **Converter:** https://riplay.cz/tools/converter/

### Things to verify:
- [ ] New content appears (personal/agentic AI direction)
- [ ] Cookie consent banner shows on first visit
- [ ] Logo displays correctly (RIPlay icon)
- [ ] Google Analytics fires after accepting cookies (check browser dev tools → Network → filter for "google-analytics")

---

## Quick One-Liner Deployment

If you prefer, you can run all steps in one command:

```bash
cd /var/www/riplay && git pull origin main && cd tools/converter && npm install && npm run build && node buildCache.js dist/cache.json && cd ../.. && sudo chown -R www-data:www-data /var/www/riplay && sudo nginx -t && sudo systemctl reload nginx && echo "✅ Deployment complete!"
```

---

## Troubleshooting

### If git pull fails:
```bash
# Check for local changes that might conflict
git status

# If needed, stash local changes
git stash
git pull origin main
git stash pop
```

### If build fails:
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run build
```

### If nginx test fails:
```bash
# Check error details
sudo nginx -t

# Check nginx error logs
sudo tail -50 /var/log/nginx/error.log
```

### If SharedArrayBuffer errors appear in browser console:
Verify your nginx config has these headers for the converter location:
```nginx
add_header Cross-Origin-Embedder-Policy "require-corp" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
```

---

## Rollback (if needed)

If something goes wrong:

```bash
cd /var/www/riplay

# View recent commits
git log --oneline -5

# Rollback to previous commit
git checkout <previous-commit-hash>

# Rebuild
cd tools/converter
npm run build

# Reload nginx
sudo systemctl reload nginx
```

---

## Summary of Recent Changes

This deployment includes:

1. **Website Restructure** - New personal/agentic AI direction
   - Updated all 3 language versions (CS, EN, DE)
   - New content sections: About me, Use Cases, Tools, Why I Do This, Contact

2. **Cookie Consent** - GDPR-compliant banner
   - Shows on first visit
   - Defers Google Analytics until user accepts
   - Stores consent in localStorage

3. **Google Analytics 4** - Measurement ID: G-K93YKBS0JP
   - Only loads after cookie consent
   - Added to all pages

4. **Logo Update** - New RIPlay icon across all pages
