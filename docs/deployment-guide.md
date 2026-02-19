# RIPlay Converter - Deployment Guide

## Overview

This guide covers:
1. Local testing of the converter
2. Deploying updates to the live VPS
3. Future backend setup (if needed for STEP/IGES)

---

## Part 1: Local Testing

### Prerequisites
- Node.js 18+ installed
- Git installed
- This repository cloned locally

### Step 1: Install Dependencies

```bash
cd c:/develop/riplay/tools/converter
npm install
```

### Step 2: Run Development Server

```bash
npm run dev
```

This starts a local development server at `http://localhost:5173/tools/converter/`

### Step 3: Test the Converter

1. Open `http://localhost:5173/tools/converter/` in your browser
2. Test CAD/CAM conversions:
   - Upload an STL file → Convert to OBJ or GLB
   - Upload a DXF file → Convert to SVG
3. Test other conversions:
   - Images (PNG, JPG, WebP)
   - Videos (MP4, WebM)
   - Documents (PDF, Markdown)

### Step 4: Build for Production

```bash
npm run build
```

This creates the `dist/` folder with optimized static files.

---

## Part 2: Deploying to VPS

### Current Setup (as understood)
- **VPS**: OVH Cloud VPS-2 (6 vCores, 12GB RAM, 100GB Storage)
- **Web Server**: nginx
- **Repository**: Cloned on VPS
- **Domain**: riplay.cz

### Option A: Simple Static Deployment (Recommended for Now)

Since the converter is 100% client-side, you only need to serve static files.

#### Step 1: SSH into your VPS

```bash
ssh your-user@your-vps-ip
```

#### Step 2: Navigate to the repository

```bash
cd /path/to/riplay  # Adjust to your actual path
```

#### Step 3: Pull the latest changes

```bash
git pull origin main
```

#### Step 4: Install dependencies and build

```bash
cd tools/converter
npm install
npm run build
```

#### Step 5: Configure nginx

Your nginx config should serve the built files. Example configuration:

```nginx
# /etc/nginx/sites-available/riplay.cz

server {
    listen 80;
    listen [::]:80;
    server_name riplay.cz www.riplay.cz;
    
    root /path/to/riplay;
    index index.html;
    
    # Main site
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Converter tool - serve built files
    location /tools/converter/ {
        alias /path/to/riplay/tools/converter/dist/;
        try_files $uri $uri/ /tools/converter/index.html;
        
        # Enable CORS for WASM files
        location ~* \.wasm$ {
            types { application/wasm wasm; }
            add_header Cross-Origin-Embedder-Policy require-corp;
            add_header Cross-Origin-Opener-Policy same-origin;
        }
    }
    
    # Other tools...
    location /tools/googlefont2svg/ {
        alias /path/to/riplay/tools/googlefont2svg/;
        try_files $uri $uri/ /tools/googlefont2svg/index.html;
    }
}
```

#### Step 6: Test and reload nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Option B: Automated Deployment Script

Create a deployment script on your VPS:

```bash
#!/bin/bash
# /path/to/riplay/deploy.sh

echo "🚀 Starting deployment..."

# Navigate to repository
cd /path/to/riplay

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Build converter
echo "🔨 Building converter..."
cd tools/converter
npm install --production
npm run build

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

---

## Part 3: Future Backend Setup (Phase 3)

For STEP/IGES conversion, you'll need a backend service.

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   nginx         │     │   Node.js API   │     │   FreeCAD       │
│   (Port 80)     │────▶│   (Port 3000)   │────▶│   (Python)      │
│   Static files  │     │   /api/convert  │     │   Conversion    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Step 1: Install FreeCAD on VPS

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install freecad

# Verify installation
freecad --version
```

### Step 2: Create Backend API

Create a new directory for the backend:

```bash
mkdir -p /path/to/riplay/backend
cd /path/to/riplay/backend
npm init -y
npm install express multer cors
```

Create `server.js`:

```javascript
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

// STEP to STL conversion using FreeCAD
app.post('/api/convert/step-to-stl', upload.single('file'), (req, res) => {
    const inputPath = req.file.path;
    const outputPath = inputPath + '.stl';
    
    const script = `
import FreeCAD
import Part
import Mesh

doc = FreeCAD.open("${inputPath}")
Mesh.export([doc.Objects], "${outputPath}")
doc.close()
`;
    
    const scriptPath = inputPath + '.py';
    fs.writeFileSync(scriptPath, script);
    
    exec(`freecadcmd ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Conversion failed' });
        }
        
        res.download(outputPath, req.file.originalname.replace(/\.[^.]+$/, '.stl'), () => {
            // Cleanup
            fs.unlinkSync(inputPath);
            fs.unlinkSync(scriptPath);
            fs.unlinkSync(outputPath);
        });
    });
});

app.listen(3000, () => {
    console.log('Converter API running on port 3000');
});
```

### Step 3: Set up PM2 for Process Management

```bash
sudo npm install -g pm2
pm2 start server.js --name converter-api
pm2 startup
pm2 save
```

### Step 4: Update nginx for API Proxy

Add to your nginx config:

```nginx
# API proxy
location /api/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # Increase timeout for large file conversions
    proxy_read_timeout 300s;
}
```

### Step 5: Update Frontend Handler

Update `tools/converter/src/handlers/stepHandler.ts`:

```typescript
async doConvert(files: FileData[], inputFormat: FileFormat, outputFormat: FileFormat): Promise<FileData[]> {
    const formData = new FormData();
    formData.append('file', new Blob([files[0].bytes]), files[0].name);
    
    const response = await fetch('/api/convert/step-to-stl', {
        method: 'POST',
        body: formData
    });
    
    const arrayBuffer = await response.arrayBuffer();
    return [{
        bytes: new Uint8Array(arrayBuffer),
        name: files[0].name.replace(/\.[^.]+$/, '.stl')
    }];
}
```

---

## Part 4: Testing Checklist

### Local Testing
- [ ] Converter loads at `http://localhost:5173/tools/converter/`
- [ ] STL file can be uploaded
- [ ] STL → OBJ conversion works
- [ ] STL → GLB conversion works
- [ ] DXF → SVG conversion works
- [ ] Image conversions work
- [ ] Video conversions work (may be slow first time due to WASM loading)

### Production Testing
- [ ] Converter loads at `https://riplay.cz/tools/converter/`
- [ ] All local tests pass on production
- [ ] Files download correctly
- [ ] No console errors

---

## Troubleshooting

### WASM Loading Issues
If you see errors about WASM files not loading:

```nginx
# Add to nginx location block for converter
location ~* \.wasm$ {
    types { application/wasm wasm; }
    add_header Cross-Origin-Embedder-Policy require-corp;
    add_header Cross-Origin-Opener-Policy same-origin;
}
```

### Large File Uploads
For larger CAD files, increase nginx limits:

```nginx
client_max_body_size 100M;
```

### FreeCAD Issues
If FreeCAD conversion fails:

```bash
# Test FreeCAD manually
freecadcmd -c "import FreeCAD; print('OK')"
```

---

## Quick Reference Commands

```bash
# Local development
cd tools/converter && npm run dev

# Build for production
cd tools/converter && npm run build

# Deploy to VPS (from VPS)
cd /path/to/riplay && git pull && cd tools/converter && npm install && npm run build

# Reload nginx
sudo systemctl reload nginx

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# PM2 commands (for backend)
pm2 status
pm2 logs converter-api
pm2 restart converter-api
```
