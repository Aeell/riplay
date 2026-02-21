# RIPlay VPS Implementation Plan

## Executive Summary

This document provides a comprehensive analysis of the RIPlay project architecture and a detailed implementation plan for deploying all tools on the OVHcloud VPS.

**VPS Specifications:**
- **Provider:** OVHcloud
- **OS:** Ubuntu 25.04
- **Resources:** 6 vCores, 12 GB RAM, 100 GB Storage
- **IPv4:** 135.125.131.4
- **IPv6:** 2001:41d0:701:1100::b909
- **Domain:** riplay.cz

---

## 1. Project Architecture Analysis

### 1.1 Current Structure

```
riplay/
├── index.html              # Czech homepage (static)
├── en.html                 # English homepage (static)
├── de.html                 # German homepage (static)
├── css/                    # Global styles
├── js/                     # Global scripts
├── img/                    # Images
├── tools/
│   ├── converter/          # Universal file converter (Vite + WASM)
│   │   ├── src/            # TypeScript source
│   │   ├── dist/           # Built output
│   │   └── docker/         # Docker configuration
│   └── googlefont2svg/     # Font to SVG converter (vanilla JS)
├── 3rd_party/convert/      # Git submodule (reference only)
└── .github/workflows/      # GitHub Pages deployment
```

### 1.2 Component Analysis

| Component | Type | Build Required | WASM | Special Headers |
|-----------|------|----------------|------|-----------------|
| Main Site (CS/EN/DE) | Static HTML | No | No | No |
| GoogleFont2SVG | Vanilla JS | No | No | No |
| Converter | Vite + TypeScript | Yes | Yes | **COOP/COEP** |

### 1.3 Critical Dependency: SharedArrayBuffer

The converter uses FFmpeg.wasm with multi-threading, which requires:

```http
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

**Important:** These headers are NOT supported on GitHub Pages. The converter will work but with single-threaded mode only (slower).

---

## 2. Deployment Architecture Options

### Option A: Hybrid Deployment (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Pages                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Main Site   │  │ Font2SVG    │  │ Converter (single-thread)│  │
│  │ (static)    │  │ (static)    │  │ (no SharedArrayBuffer)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:** Free hosting, automatic deployments
**Cons:** No SharedArrayBuffer support, slower video conversions

### Option B: Full VPS Deployment (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│                      OVHcloud VPS                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      nginx (Port 80/443)                     ││
│  │  ┌───────────┐ ┌───────────┐ ┌────────────────────────────┐ ││
│  │  │ Main Site │ │ Font2SVG  │ │ Converter (multi-threaded) │ ││
│  │  │ + COOP/COEP for converter location only                 │ ││
│  │  └───────────┘ └───────────┘ └────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Pros:** Full SharedArrayBuffer support, faster conversions, full control
**Cons:** Requires manual deployment, server maintenance

### Option C: Hybrid with VPS for Converter Only

```
┌────────────────────────────┐    ┌──────────────────────────────┐
│       GitHub Pages         │    │        OVHcloud VPS          │
│  ┌───────────┐ ┌─────────┐ │    │  ┌────────────────────────┐  │
│  │ Main Site │ │Font2SVG │ │    │  │ Converter (multi-thr)  │  │
│  └───────────┘ └─────────┘ │    │  │ converter.riplay.cz    │  │
└────────────────────────────┘    └──────────────────────────────┘
```

**Pros:** Best of both worlds
**Cons:** Requires subdomain configuration, CORS setup

---

## 3. Recommended Implementation: Option B (Full VPS)

### 3.1 Prerequisites

On your VPS, ensure these are installed:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install nginx
sudo apt install nginx -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Install Git
sudo apt install git -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### 3.2 Directory Structure on VPS

```
/var/www/riplay/
├── index.html
├── en.html
├── de.html
├── css/
├── js/
├── img/
├── tools/
│   ├── converter/
│   │   └── dist/          # Built converter files
│   └── googlefont2svg/
├── favicon.svg
├── logo.png
└── rip-icon-black.png     # Logo icon
```

### 3.3 nginx Configuration

Create `/etc/nginx/sites-available/riplay.cz`:

```nginx
# HTTP - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name riplay.cz www.riplay.cz;
    
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name riplay.cz www.riplay.cz;
    
    root /var/www/riplay;
    index index.html;
    
    # SSL certificates (configure after Certbot)
    ssl_certificate /etc/letsencrypt/live/riplay.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/riplay.cz/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/wasm;
    gzip_min_length 1000;
    
    # Security headers (global)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main site - no special headers needed
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # English version
    location = /en.html {
        try_files $uri;
    }
    
    # German version
    location = /de.html {
        try_files $uri;
    }
    
    # GoogleFont2SVG tool
    location ^~ /tools/googlefont2svg/ {
        try_files $uri $uri/ /tools/googlefont2svg/index.html;
    }
    
    # Converter tool - CRITICAL: COOP/COEP headers for SharedArrayBuffer
    location ^~ /tools/converter/ {
        alias /var/www/riplay/tools/converter/;
        try_files $uri $uri/ /tools/converter/index.html;
        
        # Required for SharedArrayBuffer (FFmpeg multi-threading)
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        
        # WASM files need correct MIME type
        location ~* \.wasm$ {
            types { application/wasm wasm; }
            add_header Cross-Origin-Embedder-Policy "require-corp" always;
            add_header Cross-Origin-Opener-Policy "same-origin" always;
        }
        
        # Increase upload size for large files
        client_max_body_size 500M;
    }
    
    # Google verification
    location = /googlece25e5f68e1fdc53.html {
        root /var/www/riplay;
    }
}
```

### 3.4 Deployment Script

Create `/var/www/riplay/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 RIPlay Deployment Started"

# Navigate to repository
cd /var/www/riplay

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Build converter
echo "🔨 Building converter..."
cd tools/converter
npm install --production
npm run build

# Generate cache
echo "📦 Generating cache..."
node buildCache.js dist/cache.json

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data /var/www/riplay

# Test nginx
echo "🧪 Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ Deployment Complete!"
```

Make executable:
```bash
chmod +x /var/www/riplay/deploy.sh
```

---

## 4. SSL Certificate Setup

### 4.1 Initial Certificate Request

```bash
# Create certbot directory
sudo mkdir -p /var/www/certbot

# Request certificate (dry run first)
sudo certbot certonly --webroot -w /var/www/certbot \
  -d riplay.cz -d www.riplay.cz \
  --dry-run

# If successful, request real certificate
sudo certbot certonly --webroot -w /var/www/certbot \
  -d riplay.cz -d www.riplay.cz

# Auto-renewal test
sudo certbot renew --dry-run
```

### 4.2 Enable nginx Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/riplay.cz /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. DNS Configuration

In your domain registrar DNS settings:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 135.125.131.4 | 3600 |
| A | www | 135.125.131.4 | 3600 |
| AAAA | @ | 2001:41d0:701:1100::b909 | 3600 |
| AAAA | www | 2001:41d0:701:1100::b909 | 3600 |

---

## 6. Verification Checklist

### 6.1 Pre-Deployment

- [ ] DNS A record points to VPS IP
- [ ] DNS AAAA record points to VPS IPv6
- [ ] VPS firewall allows ports 80 and 443
- [ ] Git repository cloned to `/var/www/riplay`

### 6.2 Post-Deployment

- [ ] Main site loads: `https://riplay.cz/`
- [ ] English version loads: `https://riplay.cz/en.html`
- [ ] German version loads: `https://riplay.cz/de.html`
- [ ] GoogleFont2SVG loads: `https://riplay.cz/tools/googlefont2svg/`
- [ ] Converter loads: `https://riplay.cz/tools/converter/`
- [ ] SSL certificate valid (green lock)
- [ ] Cookie consent banner appears
- [ ] Google Analytics fires after consent

### 6.3 Converter-Specific Tests

- [ ] FFmpeg loads without errors
- [ ] Video conversion works (test with small MP4)
- [ ] Image conversion works
- [ ] CAD conversion works (STL → OBJ)
- [ ] Check browser console for SharedArrayBuffer errors

---

## 7. Monitoring & Maintenance

### 7.1 Log Files

```bash
# nginx access logs
sudo tail -f /var/log/nginx/access.log

# nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 7.2 System Monitoring

```bash
# Check disk space
df -h

# Check memory
free -m

# Check nginx status
sudo systemctl status nginx

# Check running processes
htop
```

### 7.3 Automated Updates

```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades

# Configure
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 8. Rollback Plan

If deployment fails:

```bash
# Rollback to previous version
cd /var/www/riplay
git log --oneline -5  # Find previous commit
git checkout <previous-commit-hash>

# Rebuild converter
cd tools/converter
npm run build

# Reload nginx
sudo systemctl reload nginx
```

---

## 9. Cost Analysis

| Item | Cost |
|------|------|
| OVHcloud VPS-2 | ~€12/month |
| Domain (riplay.cz) | ~€10/year |
| SSL Certificate (Let's Encrypt) | Free |
| **Total** | **~€12/month** |

---

## 10. Next Steps

1. **Immediate:** Clone repository to VPS
2. **Configure:** Set up nginx with the provided configuration
3. **Secure:** Request SSL certificate
4. **Deploy:** Run deployment script
5. **Verify:** Complete verification checklist
6. **Monitor:** Set up log monitoring

---

## Appendix A: Quick Reference Commands

```bash
# SSH into VPS
ssh user@135.125.131.4

# Deploy updates
cd /var/www/riplay && ./deploy.sh

# View logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx

# Check SSL certificate
sudo certbot certificates

# Renew SSL
sudo certbot renew
```

## Appendix B: Troubleshooting

### Problem: SharedArrayBuffer not defined

**Solution:** Ensure COOP/COEP headers are set for `/tools/converter/` location.

### Problem: 502 Bad Gateway

**Solution:** Check nginx error logs, verify file permissions.

### Problem: SSL Certificate Error

**Solution:** Verify DNS points to correct IP, check Certbot logs.

### Problem: Large file upload fails

**Solution:** Increase `client_max_body_size` in nginx config.
