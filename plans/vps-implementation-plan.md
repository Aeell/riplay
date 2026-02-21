# RIPlay VPS Implementation Plan

## Executive Summary

This plan details the deployment of RIPlay on an OVHcloud VPS with direct nginx deployment (no Docker). The deployment serves:
- **Main site:** Static HTML/CSS/JS (Czech, English, German versions)
- **Universal Converter:** Vite/TypeScript + WASM at `/tools/converter/`
- **GoogleFont2SVG:** Vanilla JS at `/tools/googlefont2svg/`

### VPS Specifications
- **Provider:** OVHcloud
- **OS:** Ubuntu 25.04
- **Resources:** 6 vCores, 12GB RAM, 100GB storage
- **IP:** 135.125.131.4
- **Domain:** riplay.cz (already pointing to VPS)
- **SSL:** Already configured

---

## Phase 1: VPS Server Setup

### 1.1 Initial Server Access

```bash
# SSH into the VPS
ssh root@135.125.131.4

# Or if you have a user set up
ssh your-username@135.125.131.4
```

### 1.2 System Update and Essential Packages

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release \
  ufw
```

### 1.3 Install Node.js (for building converter)

```bash
# Add Node.js 22.x repository (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v22.x.x
npm --version
```

### 1.4 Install Bun (alternative, faster package manager)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Reload shell
source ~/.bashrc

# Verify installation
bun --version
```

### 1.5 Install and Configure nginx

```bash
# Install nginx
sudo apt install -y nginx

# Enable and start nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Verify nginx is running
sudo systemctl status nginx
```

### 1.6 Configure Firewall (UFW)

```bash
# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh
# Or specify port: sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'
# Or individually:
# sudo ufw allow 80/tcp
# sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Verify status
sudo ufw status verbose
```

### 1.7 Create Deployment User (Recommended)

```bash
# Create a deployment user
sudo adduser deploy

# Add to sudo group
sudo usermod -aG sudo deploy

# Add to www-data group for web files
sudo usermod -aG www-data deploy

# Switch to deploy user for subsequent steps
su - deploy
```

---

## Phase 2: nginx Configuration

### 2.1 Create Main nginx Configuration

Create the file `/etc/nginx/sites-available/riplay.cz`:

```nginx
# =================================================================
# RIPlay nginx Configuration
# Domain: riplay.cz
# =================================================================

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name riplay.cz www.riplay.cz;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name riplay.cz www.riplay.cz;
    
    # ============================================================
    # SSL Configuration (adjust paths if using different cert)
    # ============================================================
    ssl_certificate /etc/letsencrypt/live/riplay.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/riplay.cz/privkey.pem;
    
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # ============================================================
    # Root Directory
    # ============================================================
    root /var/www/riplay;
    index index.html;
    
    # ============================================================
    # Security Headers (applied globally)
    # ============================================================
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # ============================================================
    # MIME Types
    # ============================================================
    types {
        application/wasm wasm;
        application/javascript js mjs;
        text/javascript js mjs;
    }
    
    # ============================================================
    # GZIP Compression
    # ============================================================
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml
        application/wasm
        image/svg+xml;
    
    # ============================================================
    # Brotli Compression (if installed)
    # ============================================================
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/plain text/css application/javascript application/wasm;
    
    # ============================================================
    # Upload Size Limit
    # ============================================================
    client_max_body_size 500M;
    
    # ============================================================
    # Main Site - Root Location
    # ============================================================
    location / {
        try_files $uri $uri/ $uri.html =404;
    }
    
    # ============================================================
    # HTML Files - No Caching
    # ============================================================
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri =404;
    }
    
    # ============================================================
    # Static Assets - Long-term Caching
    # ============================================================
    
    # JavaScript files
    location ~* \.js$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    
    # CSS files
    location ~* \.css$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    
    # Images
    location ~* \.(png|jpg|jpeg|gif|svg|webp|ico|avif)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    
    # Fonts
    location ~* \.(woff|woff2|ttf|otf|eot)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Access-Control-Allow-Origin "*";
        try_files $uri =404;
    }
    
    # ============================================================
    # Universal Converter - /tools/converter/
    # CRITICAL: Requires COOP/COEP headers for SharedArrayBuffer
    # ============================================================
    location /tools/converter/ {
        alias /var/www/riplay/tools/converter/dist/;
        try_files $uri $uri/ /tools/converter/index.html;
        
        # COOP/COEP headers for SharedArrayBuffer (required for FFmpeg WASM)
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        add_header Cross-Origin-Opener-Policy "same-origin" always;
    }
    
    # WASM files in converter - with COOP/COEP headers
    location ~* ^/tools/converter/.*\.wasm$ {
        alias /var/www/riplay/tools/converter/dist/;
        types {
            application/wasm wasm;
        }
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # JavaScript files in converter - with COOP/COEP headers
    location ~* ^/tools/converter/.*\.js$ {
        alias /var/www/riplay/tools/converter/dist/;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # ============================================================
    # GoogleFont2SVG Tool - /tools/googlefont2svg/
    # ============================================================
    location /tools/googlefont2svg/ {
        alias /var/www/riplay/tools/googlefont2svg/;
        index index.html;
        try_files $uri $uri/ /tools/googlefont2svg/index.html;
    }
    
    # ============================================================
    # Security - Block Sensitive Files
    # ============================================================
    location ~ /\. {
        deny all;
        return 404;
    }
    
    location ~* \.(git|gitignore|env|md|log|bak|backup|sql|database)$ {
        deny all;
        return 404;
    }
    
    # Block access to node_modules and source files
    location ~* ^/(node_modules|src|\.vscode|\.github)/ {
        deny all;
        return 404;
    }
    
    location ~* ^/tools/converter/(src|node_modules|\.vscode)/ {
        deny all;
        return 404;
    }
    
    # ============================================================
    # Error Pages
    # ============================================================
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### 2.2 Enable the Site

```bash
# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/riplay.cz /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 2.3 Install Brotli (Optional, for better compression)

```bash
# Install nginx Brotli module
sudo apt install -y libnginx-mod-http-brotli

# Uncomment Brotli lines in config above, then reload
sudo systemctl reload nginx
```

---

## Phase 3: Repository Setup and Build Process

### 3.1 Clone Repository

```bash
# Create web directory
sudo mkdir -p /var/www/riplay

# Set ownership
sudo chown -R $USER:www-data /var/www/riplay
sudo chmod -R 775 /var/www/riplay

# Clone repository
cd /var/www
git clone https://github.com/Aeell/riplay.git riplay

# Or if directory exists:
# cd /var/www/riplay
# git pull origin main
```

### 3.2 Initialize Submodules

```bash
cd /var/www/riplay

# Initialize and update submodules
git submodule update --init --recursive
```

### 3.3 Build the Converter

```bash
# Navigate to converter directory
cd /var/www/riplay/tools/converter

# Install dependencies (using npm or bun)
npm install
# OR (faster with Bun)
# bun install

# Build for production
npm run build
# OR
# bun run build

# Verify build output
ls -la dist/
# Expected: index.html, assets/, wasm/
```

### 3.4 Directory Structure After Build

```
/var/www/riplay/
├── index.html              # Main site (Czech)
├── en.html                 # English version
├── de.html                 # German version
├── css/
│   ├── style.css
│   └── riplay-design-system.css
├── js/
│   └── script.js
├── img/
│   └── ...
├── tools/
│   ├── converter/
│   │   ├── dist/           # Built converter (served by nginx)
│   │   │   ├── index.html
│   │   │   ├── assets/
│   │   │   │   ├── index-*.js
│   │   │   │   ├── index-*.css
│   │   │   │   └── *.wasm
│   │   │   └── wasm/
│   │   │       ├── ffmpeg-core.js
│   │   │       ├── ffmpeg-core.wasm
│   │   │       └── magick.wasm
│   │   ├── src/            # Source files (not served)
│   │   ├── node_modules/   # Dependencies (not served)
│   │   └── package.json
│   └── googlefont2svg/
│       ├── index.html
│       ├── index.js
│       ├── index.css
│       └── ...
├── favicon.svg
├── logo.png
└── ...
```

### 3.5 Set Final Permissions

```bash
# Set ownership to www-data
sudo chown -R www-data:www-data /var/www/riplay

# Set directory permissions
sudo find /var/www/riplay -type d -exec chmod 755 {} \;

# Set file permissions
sudo find /var/www/riplay -type f -exec chmod 644 {} \;

# Make sure deploy user can write (for updates)
sudo usermod -aG www-data $USER
```

---

## Phase 4: Deployment Workflow

### 4.1 Manual Update Process

```bash
# SSH into VPS
ssh your-user@135.125.131.4

# Navigate to repository
cd /var/www/riplay

# Pull latest changes
git pull origin main

# Rebuild converter if changed
cd tools/converter
npm install
npm run build

# Reload nginx (if config changed)
sudo systemctl reload nginx
```

### 4.2 Automated Deployment Script

Create `/var/www/riplay/deploy.sh`:

```bash
#!/bin/bash
# RIPlay Deployment Script
# Usage: ./deploy.sh [--skip-build]

set -e

echo "🚀 RIPlay Deployment Started"
echo "============================"

# Configuration
RIPLAY_DIR="/var/www/riplay"
CONVERTER_DIR="$RIPLAY_DIR/tools/converter"
BACKUP_DIR="/var/www/riplay-backup"

# Parse arguments
SKIP_BUILD=false
if [[ "$1" == "--skip-build" ]]; then
    SKIP_BUILD=true
fi

# Navigate to repository
cd "$RIPLAY_DIR"

# Create backup
echo "📦 Creating backup..."
if [ -d "$BACKUP_DIR" ]; then
    rm -rf "$BACKUP_DIR"
fi
cp -r "$RIPLAY_DIR" "$BACKUP_DIR"

# Pull latest changes
echo "📥 Pulling latest changes..."
git fetch origin
git pull origin main

# Check if converter needs rebuild
if [[ "$SKIP_BUILD" == false ]]; then
    echo "🔨 Building converter..."
    cd "$CONVERTER_DIR"
    
    # Install/update dependencies
    npm install
    
    # Build
    npm run build
    
    echo "✅ Build complete"
else
    echo "⏭️ Skipping build (--skip-build flag)"
fi

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data "$RIPLAY_DIR"
sudo find "$RIPLAY_DIR" -type d -exec chmod 755 {} \;
sudo find "$RIPLAY_DIR" -type f -exec chmod 644 {} \;

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo "Site: https://riplay.cz"
echo "Converter: https://riplay.cz/tools/converter/"
echo "GoogleFont2SVG: https://riplay.cz/tools/googlefont2svg/"
```

Make it executable:
```bash
chmod +x /var/www/riplay/deploy.sh
```

### 4.3 Zero-Downtime Deployment Strategy

For production updates with zero downtime:

```bash
#!/bin/bash
# Zero-downtime deployment script

RIPLAY_DIR="/var/www/riplay"
STAGING_DIR="/var/www/riplay-staging"
LIVE_LINK="/var/www/riplay-live"

# Clone/update staging
if [ -d "$STAGING_DIR" ]; then
    cd "$STAGING_DIR"
    git pull origin main
else
    git clone https://github.com/Aeell/riplay.git "$STAGING_DIR"
fi

# Build in staging
cd "$STAGING_DIR/tools/converter"
npm install
npm run build

# Set permissions
sudo chown -R www-data:www-data "$STAGING_DIR"

# Atomic switch (symlink swap)
ln -sfn "$STAGING_DIR" "$LIVE_LINK.tmp"
mv -Tf "$LIVE_LINK.tmp" "$LIVE_LINK"

# Reload nginx
sudo systemctl reload nginx

echo "✅ Zero-downtime deployment complete"
```

---

## Phase 5: Local Project Files to Create

### 5.1 nginx Configuration File

Create `nginx/riplay.cz.conf` in the repository:

```nginx
# This file should be copied to /etc/nginx/sites-available/riplay.cz
# See Phase 2 for full configuration
```

### 5.2 Deployment Script

Create `deploy.sh` in the repository root (see Phase 4.2).

### 5.3 Add Deploy Script to package.json (Optional)

Add to root `package.json` (create if doesn't exist):

```json
{
  "name": "riplay",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "deploy": "bash deploy.sh",
    "deploy:skip-build": "bash deploy.sh --skip-build"
  }
}
```

### 5.4 Create .gitignore Entries (Verify)

Ensure these are in `.gitignore`:

```gitignore
# Dependencies
node_modules/

# Build outputs (keep dist for deployment)
# dist/

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Cache
.cache/
```

---

## Phase 6: SSL Certificate Setup

### 6.1 Install Certbot (if not already installed)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtain SSL Certificate

```bash
# Obtain certificate (nginx plugin handles config automatically)
sudo certbot --nginx -d riplay.cz -d www.riplay.cz

# Follow prompts:
# 1. Enter email for notifications
# 2. Agree to terms
# 3. Choose redirect HTTP to HTTPS (recommended)
```

### 6.3 Test Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Certbot sets up auto-renewal via systemd timer
sudo systemctl status certbot.timer
```

### 6.4 Manual Renewal

```bash
# Renew all certificates
sudo certbot renew

# Reload nginx after renewal
sudo systemctl reload nginx
```

---

## Phase 7: Verification Checklist

### 7.1 Verify WASM Headers

```bash
# Check COOP/COEP headers on converter
curl -I https://riplay.cz/tools/converter/

# Expected headers:
# Cross-Origin-Embedder-Policy: require-corp
# Cross-Origin-Opener-Policy: same-origin

# Check WASM file headers
curl -I https://riplay.cz/tools/converter/wasm/ffmpeg-core.wasm

# Expected:
# Content-Type: application/wasm
# Cross-Origin-Embedder-Policy: require-corp
# Cross-Origin-Opener-Policy: same-origin
```

### 7.2 Test SharedArrayBuffer Availability

Open browser console at `https://riplay.cz/tools/converter/` and run:

```javascript
// Check if SharedArrayBuffer is available
if (typeof SharedArrayBuffer !== 'undefined') {
    console.log('✅ SharedArrayBuffer is available');
    console.log('Cross-Origin headers are correctly configured');
} else {
    console.error('❌ SharedArrayBuffer is NOT available');
    console.error('Check COOP/COEP headers');
}
```

### 7.3 Verify SSL Configuration

```bash
# Check SSL certificate
openssl s_client -connect riplay.cz:443 -servername riplay.cz < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Test SSL Labs (external)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=riplay.cz
```

### 7.4 Test Site Functionality

```bash
# Test main site
curl -I https://riplay.cz/
# Expected: HTTP/2 200

# Test English version
curl -I https://riplay.cz/en.html
# Expected: HTTP/2 200

# Test converter
curl -I https://riplay.cz/tools/converter/
# Expected: HTTP/2 200 with COOP/COEP headers

# Test GoogleFont2SVG
curl -I https://riplay.cz/tools/googlefont2svg/
# Expected: HTTP/2 200
```

### 7.5 Performance Testing

```bash
# Install Apache Bench
sudo apt install -y apache2-utils

# Test main site (100 requests, 10 concurrent)
ab -n 100 -c 10 https://riplay.cz/

# Test converter
ab -n 100 -c 10 https://riplay.cz/tools/converter/
```

### 7.6 Browser Testing Checklist

- [ ] Main site loads: `https://riplay.cz/`
- [ ] Language switching works (CS/EN/DE)
- [ ] Converter loads: `https://riplay.cz/tools/converter/`
- [ ] File upload works
- [ ] STL → OBJ conversion works
- [ ] DXF → SVG conversion works
- [ ] Video conversion works (tests FFmpeg WASM)
- [ ] GoogleFont2SVG loads: `https://riplay.cz/tools/googlefont2svg/`
- [ ] Font preview works
- [ ] SVG download works
- [ ] DXF export works
- [ ] No console errors

---

## Phase 8: Monitoring and Maintenance

### 8.1 Log Files

```bash
# nginx access log
sudo tail -f /var/log/nginx/access.log

# nginx error log
sudo tail -f /var/log/nginx/error.log

# View last 100 lines
sudo tail -100 /var/log/nginx/error.log
```

### 8.2 Health Check Script

Create `/usr/local/bin/riplay-health-check.sh`:

```bash
#!/bin/bash
# RIPlay Health Check Script

# Check nginx
if ! systemctl is-active --quiet nginx; then
    echo "❌ nginx is not running"
    exit 1
fi
echo "✅ nginx is running"

# Check main site
if ! curl -sf https://riplay.cz/ > /dev/null; then
    echo "❌ Main site not responding"
    exit 1
fi
echo "✅ Main site responding"

# Check converter
if ! curl -sf https://riplay.cz/tools/converter/ > /dev/null; then
    echo "❌ Converter not responding"
    exit 1
fi
echo "✅ Converter responding"

# Check SSL certificate expiry (warn if < 30 days)
EXPIRY=$(echo | openssl s_client -connect riplay.cz:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt 30 ]; then
    echo "⚠️ SSL certificate expires in $DAYS_LEFT days"
else
    echo "✅ SSL certificate valid for $DAYS_LEFT days"
fi

# Check disk space
DISK_USAGE=$(df -h /var/www | tail -1 | awk '{print $5}' | tr -d '%')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️ Disk usage at ${DISK_USAGE}%"
else
    echo "✅ Disk usage at ${DISK_USAGE}%"
fi

echo ""
echo "All checks passed!"
```

### 8.3 Set Up Log Rotation (if needed)

nginx logs are already rotated by default. Verify:

```bash
cat /etc/logrotate.d/nginx
```

### 8.4 System Updates

```bash
# Update system packages (run periodically)
sudo apt update && sudo apt upgrade -y

# Update Node.js packages (if needed)
cd /var/www/riplay/tools/converter
npm outdated
npm update
```

---

## Troubleshooting

### Common Issues

#### 1. WASM Files Not Loading

**Symptoms:** Console errors about WASM files, FFmpeg not working

**Solution:**
```bash
# Check WASM MIME type
curl -I https://riplay.cz/tools/converter/wasm/ffmpeg-core.wasm | grep Content-Type
# Should show: Content-Type: application/wasm

# Check COOP/COEP headers
curl -I https://riplay.cz/tools/converter/ | grep -i cross-origin
# Should show both headers
```

#### 2. SharedArrayBuffer Not Available

**Symptoms:** `ReferenceError: SharedArrayBuffer is not defined`

**Solution:**
- Verify COOP/COEP headers are present
- Ensure HTTPS is enabled (headers only work with secure contexts)
- Check that headers apply to ALL resources (JS, WASM, CSS)

#### 3. 404 Errors on Converter

**Symptoms:** Converter returns 404

**Solution:**
```bash
# Check if dist directory exists
ls -la /var/www/riplay/tools/converter/dist/

# Rebuild if missing
cd /var/www/riplay/tools/converter
npm run build

# Check nginx alias path
sudo nginx -t
```

#### 4. Permission Denied Errors

**Symptoms:** 403 Forbidden errors

**Solution:**
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/riplay
sudo find /var/www/riplay -type d -exec chmod 755 {} \;
sudo find /var/www/riplay -type f -exec chmod 644 {} \;
```

#### 5. Large File Upload Fails

**Symptoms:** 413 Request Entity Too Large

**Solution:**
```nginx
# Increase client_max_body_size in nginx config
client_max_body_size 500M;
```

---

## Quick Reference Commands

```bash
# SSH into VPS
ssh user@135.125.131.4

# Deploy updates
cd /var/www/riplay && ./deploy.sh

# Manual build
cd /var/www/riplay/tools/converter && npm run build

# Reload nginx
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/error.log

# Check status
sudo systemctl status nginx

# Health check
/usr/local/bin/riplay-health-check.sh

# SSL certificate status
sudo certbot certificates

# Renew SSL
sudo certbot renew

# Firewall status
sudo ufw status
```

---

## Summary

This plan provides a complete guide for deploying RIPlay on an OVHcloud VPS with:

1. **Direct nginx deployment** (no Docker)
2. **Proper WASM/SharedArrayBuffer headers** for FFmpeg multi-threading
3. **Secure configuration** with SSL, firewall, and security headers
4. **Automated deployment workflow** with rollback capability
5. **Monitoring and maintenance** procedures

The critical configuration for WASM support is the COOP/COEP headers that must be applied to the converter location block and all its resources (JS, WASM files).
