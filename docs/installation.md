# Installation Guide

## System Requirements

### Development Environment
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Git:** Latest version
- **Operating System:** Windows, macOS, or Linux

### Production Server
- **CPU:** 2+ cores recommended
- **RAM:** 4GB minimum, 8GB+ recommended for converter
- **Storage:** 10GB minimum for WASM binaries
- **Web Server:** Nginx, Apache, or similar

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Aeell/riplay.git
cd riplay
```

### 2. Main Website Setup

The main website is static HTML/CSS/JS and requires no build step:

```bash
# Option 1: Use any static file server
npx serve .

# Option 2: Use Python's built-in server
python -m http.server 8000

# Option 3: Use PHP's built-in server
php -S localhost:8000
```

### 3. Converter Tool Setup

The Universal File Converter requires a build step:

```bash
cd tools/converter

# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Production build
npm run build
```

### 4. GoogleFont2SVG Setup

The GoogleFont2SVG tool is self-contained and requires no build:

```bash
# Simply serve the directory
npx serve tools/googlefont2svg
```

## Configuration

### Environment Variables

The converter tool supports these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Dev server port | `5173` |

### Vite Configuration

The converter uses Vite. Configuration is in [`tools/converter/vite.config.ts`](../tools/converter/vite.config.ts):

```typescript
// Key configuration options
export default defineConfig({
  base: '/tools/converter/',  // Base path for deployment
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

## WASM Binaries

The converter uses WebAssembly for heavy processing:

### FFmpeg (Video/Audio Conversion)
- Located at: `tools/converter/wasm/ffmpeg/`
- Used for: Video and audio transcoding

### ImageMagick (Image Processing)
- Located at: `tools/converter/wasm/magick/`
- Used for: Image format conversion

These are loaded dynamically when needed. Ensure your web server serves `.wasm` files with the correct MIME type:

```nginx
# Nginx configuration
types {
    application/wasm wasm;
}
```

## Troubleshooting

### Common Issues

#### 1. WASM Loading Errors

**Problem:** Console shows "Failed to fetch wasm file"

**Solution:** 
- Ensure WASM files exist in the correct paths
- Check web server MIME type configuration
- Verify CORS headers if serving from different domain

#### 2. Build Errors

**Problem:** TypeScript compilation fails

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. CORS Errors

**Problem:** Browser blocks requests to local files

**Solution:** Use a proper web server instead of `file://` protocol

### Getting Help

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/Aeell/riplay/issues)
2. Contact: stanwesly@protonmail.com

## Next Steps

After installation, see:
- [Architecture Overview](./architecture.md)
- [Converter Tool Guide](./converter-guide.md)
- [Deployment Guide](./deployment.md)
