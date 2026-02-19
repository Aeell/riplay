# Deployment Guide

## Production Requirements

### Server Specifications

**Minimum:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- Bandwidth: 1TB/month

**Recommended:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB SSD
- Bandwidth: 5TB/month

### Software Requirements

- Web server (Nginx recommended)
- SSL certificate (Let's Encrypt recommended)
- Node.js 18+ (for build process only)

## Build Process

### 1. Build the Converter

```bash
cd tools/converter
npm install
npm run build
```

This creates the `dist/` directory with compiled assets.

### 2. Verify Build

```bash
# Check build output
ls -la tools/converter/dist/

# Expected files:
# - index.html
# - assets/*.js
# - assets/*.css
# - wasm/ (WASM binaries)
```

## Nginx Configuration

### Basic Configuration

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name riplay.cz www.riplay.cz;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name riplay.cz www.riplay.cz;
    
    root /var/www/riplay;
    index index.html;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/riplay.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/riplay.cz/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # WASM MIME type
    types {
        application/wasm wasm;
    }
    
    # CORS headers for WASM
    location ~* \.wasm$ {
        add_header Cross-Origin-Embedder-Policy "require-corp";
        add_header Cross-Origin-Opener-Policy "same-origin";
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # JavaScript files
    location ~* \.js$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # CSS files
    location ~* \.css$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Images
    location ~* \.(png|jpg|jpeg|gif|svg|webp|ico)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Fonts
    location ~* \.(woff|woff2|ttf|otf|eot)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Access-Control-Allow-Origin "*";
    }
    
    # Main pages - no caching for HTML
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Default location
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Converter tool
    location /tools/converter/ {
        try_files $uri $uri/ /tools/converter/index.html;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml
        application/wasm;
}
```

### SharedArrayBuffer Configuration

For FFmpeg WASM with multi-threading, SharedArrayBuffer requires specific headers:

```nginx
# Add to server block
location /tools/converter/ {
    add_header Cross-Origin-Embedder-Policy "require-corp";
    add_header Cross-Origin-Opener-Policy "same-origin";
}
```

## Deployment Steps

### 1. Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Install Node.js (for building)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Deploy Application

```bash
# Create web directory
sudo mkdir -p /var/www/riplay

# Clone or copy files
git clone https://github.com/Aeell/riplay.git /tmp/riplay

# Build converter
cd /tmp/riplay/tools/converter
npm install
npm run build

# Copy to web directory
sudo cp -r /tmp/riplay/* /var/www/riplay/

# Set permissions
sudo chown -R www-data:www-data /var/www/riplay
sudo chmod -R 755 /var/www/riplay
```

### 3. Configure SSL

```bash
# Obtain SSL certificate
sudo certbot --nginx -d riplay.cz -d www.riplay.cz

# Test auto-renewal
sudo certbot renew --dry-run
```

### 4. Enable Site

```bash
# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/riplay

# Enable site
sudo ln -s /etc/nginx/sites-available/riplay /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Post-Deployment Verification

### 1. Check Site Availability

```bash
# Test main site
curl -I https://riplay.cz/

# Test converter
curl -I https://riplay.cz/tools/converter/

# Test WASM files
curl -I https://riplay.cz/tools/converter/wasm/ffmpeg/ffmpeg-core.wasm
```

### 2. Verify Headers

```bash
# Check security headers
curl -I https://riplay.cz/ | grep -E "(Strict-Transport|X-Frame|X-Content)"

# Check WASM headers
curl -I https://riplay.cz/tools/converter/wasm/ffmpeg/ffmpeg-core.wasm | grep -E "(Cross-Origin|Content-Type)"
```

### 3. Test Converter

1. Open https://riplay.cz/tools/converter/
2. Upload a test file
3. Verify conversion works
4. Check browser console for errors

## Monitoring

### Log Files

```bash
# Nginx access log
tail -f /var/log/nginx/access.log

# Nginx error log
tail -f /var/log/nginx/error.log
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "ERROR: Nginx is not running"
    exit 1
fi

# Check if site responds
if ! curl -sf https://riplay.cz/ > /dev/null; then
    echo "ERROR: Site not responding"
    exit 1
fi

# Check SSL certificate
if ! echo | openssl s_client -connect riplay.cz:443 2>/dev/null | grep -q "Verify return code: 0"; then
    echo "WARNING: SSL certificate issue"
fi

echo "All checks passed"
```

## Updates

### Update Process

```bash
# Pull latest changes
cd /tmp/riplay
git pull origin main

# Rebuild converter if changed
cd tools/converter
npm install
npm run build

# Deploy to production
sudo cp -r /tmp/riplay/* /var/www/riplay/
sudo chown -R www-data:www-data /var/www/riplay

# Clear browser cache (optional)
# No server restart needed for static files
```

### Rollback

```bash
# Keep backup of previous version
sudo cp -r /var/www/riplay /var/www/riplay.backup

# To rollback
sudo rm -rf /var/www/riplay
sudo mv /var/www/riplay.backup /var/www/riplay
```

## Troubleshooting

### Common Issues

#### 502 Bad Gateway

**Cause:** Nginx can't reach the application

**Solution:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

#### WASM Not Loading

**Cause:** Missing CORS headers or wrong MIME type

**Solution:**
```bash
# Verify MIME type is set
grep -r "application/wasm" /etc/nginx/

# Verify CORS headers
curl -I https://riplay.cz/tools/converter/wasm/ffmpeg/ffmpeg-core.wasm
```

#### SSL Certificate Errors

**Cause:** Expired or misconfigured certificate

**Solution:**
```bash
# Renew certificate
sudo certbot renew

# Test configuration
sudo certbot certificates
```
