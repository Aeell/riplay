# Toolbox Ecosystem Implementation Plan

## Overview

This plan outlines the complete implementation of the RIPlay Toolbox ecosystem - a collection of free, privacy-focused, client-side tools with optional server acceleration for specific use cases.

## Architecture Summary

### Design System Analysis

The project uses a unified design system with:

- **CSS Variables**: All prefixed with `--rds-` in [`css/riplay-design-system.css`](css/riplay-design-system.css)
- **Primary Accent**: Ember (`#e85d26`) with fire gradient
- **Glassmorphism**: `--rds-glass-bg`, `--rds-glass-blur`, `--rds-glass-border`
- **Typography**: Inter (body) + JetBrains Mono (code/technical)
- **Components**: `.rds-btn`, `.rds-card`, `.rds-nav`, `.rds-input`, `.rds-badge`

### Existing Patterns

From [`index.html`](index.html) and [`tools/googlefont2svg/index.html`](tools/googlefont2svg/index.html):

1. **Navigation Structure**:
   - Fixed navbar with `.rds-nav` class
   - Mobile hamburger menu with `.rds-hamburger`
   - Language switcher with `.lang-switch`

2. **Tool Card Pattern**:
   - `.tool-card` with preview area and body
   - SVG illustrations in preview
   - Technology badges with `.tool-card-tech`

3. **Cookie Consent**: Already implemented with localStorage

---

## File Structure

```
/tools/
├── index.html          # CZ - Toolbox Hub
├── en.html             # EN - Toolbox Hub  
├── de.html             # DE - Toolbox Hub
├── convert/            # EXISTS - Universal Converter
├── GoogleFont2SVG/     # EXISTS - Font to SVG
├── pdf-toolkit/
│   ├── index.html
│   └── app.js
├── image-compressor/
│   ├── index.html
│   └── app.js
└── qr-studio/
    ├── index.html
    └── app.js
```

---

## Deliverables

### 1. Toolbox Hub Pages

#### 1.1 `/tools/index.html` (Czech - Primary)

**Page Structure**:
```html
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Toolbox — nástroje zdarma | RIPlay</title>
  <meta name="description" content="...">
  <!-- Hreflang, OG, Twitter, JSON-LD -->
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <nav class="rds-nav">...</nav>
  <header class="toolbox-hero">...</header>
  <main class="toolbox-grid">
    <!-- 5 tool cards -->
  </main>
  <footer>...</footer>
  <div id="cookie-banner">...</div>
  <script src="../js/script.js"></script>
</body>
</html>
```

**Tool Cards (3-column grid, exact order)**:

| # | Tool | Status | Link |
|---|------|--------|------|
| 1 | Universal File Converter | EXISTS | `/tools/convert/` |
| 2 | GoogleFont2SVG | EXISTS | `/tools/GoogleFont2SVG/` |
| 3 | PDF Toolkit | BUILD | `/tools/pdf-toolkit/` |
| 4 | Image Compressor | BUILD | `/tools/image-compressor/` |
| 5 | QR Code Studio | BUILD | `/tools/qr-studio/` |

**Card Component Structure**:
```html
<a href="path/to/tool/" class="tool-card rds-fade-in" aria-label="Open Tool Name">
  <div class="tool-card-preview">
    <!-- 48x48px SVG icon with glow effect -->
    <svg class="tool-card-illustration">...</svg>
    <div class="tool-card-badge">
      <span class="rds-badge rds-badge-success">ZDARMA</span>
    </div>
  </div>
  <div class="tool-card-body">
    <h3 class="tool-card-title">Tool Name</h3>
    <p class="tool-card-description">One sentence description.</p>
    <div class="tool-card-tech">
      <span>Tech1</span>
      <span>Tech2</span>
    </div>
    <span class="rds-btn rds-btn-tool">Otevřít nástroj →</span>
  </div>
</a>
```

#### 1.2 `/tools/en.html` (English)

Same structure with English translations.

#### 1.3 `/tools/de.html` (German)

Same structure with German translations.

---

### 2. PDF Toolkit (Priority Implementation)

#### 2.1 Features

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Drag-drop zone | Animated border on hover/drag | CSS + JS |
| Multiple upload | Support multiple PDF files | `<input multiple>` |
| Live thumbnails | First page render per PDF | pdf-lib + canvas |
| Reorder | Drag thumbnails (desktop) / up-down buttons (mobile) | Drag API + touch |
| Rotate | 90° clockwise per page | pdf-lib |
| Split | Extract page range | pdf-lib |
| Merge | Combine all PDFs in order | pdf-lib |
| Compress | Quality/filesize slider | Server or pdf-lib |
| Delete | Remove individual pages | UI state |
| Progress indicator | For all operations | CSS + JS |
| Download | Timestamp filename | Blob download |

#### 2.2 Tech Stack

- **Client**: pdf-lib 1.17.1 via CDN
  ```html
  <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
  ```
- **Server (optional)**: Node.js Express for files >50MB

#### 2.3 UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Logo + Title + Back button                         │
├─────────────────────────────────────────────────────────────┤
│  DROP ZONE: Drag & drop PDF files here                      │
│  [Browse files]                                             │
├─────────────────────────────────────────────────────────────┤
│  TOOLBAR: [Merge All] [Split] [Compress] [Clear All]        │
├─────────────────────────────────────────────────────────────┤
│  THUMBNAIL GRID:                                            │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                           │
│  │ PDF │ │ PDF │ │ PDF │ │ PDF │  (horizontal snap scroll  │
│  │  1  │ │  2  │ │  3  │ │  4  │   on mobile)              │
│  └─────┘ └─────┘ └─────┘ └─────┘                           │
│  [↑] [↓] [↻] [✕]  (per-page controls)                      │
├─────────────────────────────────────────────────────────────┤
│  PROGRESS BAR: ████████░░░░ 67%                             │
├─────────────────────────────────────────────────────────────┤
│  DOWNLOAD BUTTON: [Download Result]                         │
└─────────────────────────────────────────────────────────────┘
```

#### 2.4 Mobile Requirements

- Touch targets: minimum 48x48px
- Thumbnails: horizontal snap scroll
- Long-press for options menu
- Up/down buttons for reorder (no drag on touch)

---

### 3. Image Compressor

#### 3.1 Features

| Feature | Description |
|---------|-------------|
| Drag-drop / file picker | JPG, PNG, WebP, AVIF |
| Quality slider | 10-100% |
| Format conversion | Convert between formats |
| Real-time preview | Before/after comparison |
| File size display | Reduction percentage |
| Batch processing | Up to 20 images |
| Download options | Individual or ZIP |

#### 3.2 Tech Stack

- **Client**: Canvas API for compression
- **Server (preferred)**: POST `/api/image/compress` for better quality algorithms
- **ZIP**: JSZip via CDN

---

### 4. QR Code Studio

#### 4.1 Features

| Feature | Description |
|---------|-------------|
| Text/URL input | Content to encode |
| Color picker | Foreground/background |
| Size selector | 128-1024px |
| Logo upload | Center overlay |
| Download | PNG/SVG |
| Live preview | Real-time update |

#### 4.2 Tech Stack

- **Client**: qrcode-generator library via CDN
  ```html
  <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
  ```
- **Fully client-side**: No server needed

---

### 5. Navigation Updates

#### 5.1 Files to Update

- [`index.html`](index.html) - Czech main page
- [`en.html`](en.html) - English main page
- [`de.html`](de.html) - German main page

#### 5.2 Exact Search-Replace

**Current navigation** (around line 212-216 in index.html):
```html
<div class="rds-nav-links">
  <a href="#usecases" class="rds-nav-link">Použití</a>
  <a href="#tools" class="rds-nav-link">Nástroje</a>
  <a href="#why" class="rds-nav-link">Proč</a>
  <a href="#contact" class="rds-nav-link">Kontakt</a>
  <div class="lang-switch">...</div>
</div>
```

**Updated navigation**:
```html
<div class="rds-nav-links">
  <a href="#usecases" class="rds-nav-link">Použití</a>
  <a href="#tools" class="rds-nav-link">Nástroje</a>
  <a href="tools/" class="rds-nav-link">Toolbox</a>
  <a href="#why" class="rds-nav-link">Proč</a>
  <a href="#contact" class="rds-nav-link">Kontakt</a>
  <div class="lang-switch">...</div>
</div>
```

**For en.html**:
```html
<a href="tools/en.html" class="rds-nav-link">Toolbox</a>
```

**For de.html**:
```html
<a href="tools/de.html" class="rds-nav-link">Toolbox</a>
```

---

### 6. Server Endpoints (Optional)

#### 6.1 Node.js Express Implementation

```javascript
// server.js
const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});

// POST /api/pdf/merge
app.post('/api/pdf/merge', upload.array('files'), async (req, res) => {
  // Memory-only processing
  // Immediate deletion after response
  // 60 second timeout
});

// POST /api/pdf/split
app.post('/api/pdf/split', upload.single('file'), async (req, res) => {
  // Extract page ranges
});

// POST /api/pdf/compress
app.post('/api/pdf/compress', upload.single('file'), async (req, res) => {
  // Quality reduction
});

// POST /api/image/compress
app.post('/api/image/compress', upload.array('images'), async (req, res) => {
  // Sharp-based compression
});
```

#### 6.2 Security Requirements

- Memory-only processing (no temp files)
- Immediate deletion after response
- Zero logging of file contents
- 60 second timeout
- 200MB max file size

---

### 7. Sitemap Updates

Add to [`sitemap.xml`](sitemap.xml):

```xml
<!-- Toolbox Hub -->
<url>
  <loc>https://riplay.cz/tools/</loc>
  <lastmod>2026-02-21</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.9</priority>
  <xhtml:link rel="alternate" hreflang="cs" href="https://riplay.cz/tools/"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://riplay.cz/tools/en.html"/>
  <xhtml:link rel="alternate" hreflang="de" href="https://riplay.cz/tools/de.html"/>
</url>

<!-- PDF Toolkit -->
<url>
  <loc>https://riplay.cz/tools/pdf-toolkit/</loc>
  <lastmod>2026-02-21</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>

<!-- Image Compressor -->
<url>
  <loc>https://riplay.cz/tools/image-compressor/</loc>
  <lastmod>2026-02-21</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>

<!-- QR Code Studio -->
<url>
  <loc>https://riplay.cz/tools/qr-studio/</loc>
  <lastmod>2026-02-21</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

---

### 8. Robots.txt Updates

Add to [`robots.txt`](robots.txt):

```
# API endpoints (if implemented)
Disallow: /api/
```

---

### 9. README Updates

Add Toolbox section to [`README.md`](README.md):

```markdown
## 🧰 Toolbox

Free, private, client-side tools:

- **[Universal Converter](tools/converter/)** - Convert files between formats
- **[GoogleFont2SVG](tools/googlefont2svg/)** - Convert fonts to SVG paths
- **[PDF Toolkit](tools/pdf-toolkit/)** - Merge, split, rotate, compress PDFs
- **[Image Compressor](tools/image-compressor/)** - Optimize and convert images
- **[QR Code Studio](tools/qr-studio/)** - Generate custom QR codes

All tools process files locally in your browser. No data leaves your device.
```

---

## Mobile Requirements (Non-Negotiable)

| Requirement | Implementation |
|-------------|----------------|
| Viewport meta | `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` |
| Touch targets | Minimum 48x48px for all interactive elements |
| Breakpoint | 640px (1-column below, 3-column above) |
| No horizontal scroll | `overflow-x: hidden` on body |
| PDF thumbnails | Horizontal snap scroll on mobile |
| Body font | Minimum 16px |
| Headings | `clamp(1.5rem, 4vw, 2.5rem)` |
| Lazy loading | `loading="lazy"` on all images/iframes |
| Page weight | <150KB gzipped |

---

## Analytics Events

| Event Name | Trigger | Tool |
|------------|---------|------|
| `pdf_toolkit_download` | Download button click | PDF Toolkit |
| `image_compressor_download` | Download button click | Image Compressor |
| `qr_studio_download` | Download button click | QR Code Studio |

Implementation:
```javascript
gtag('event', 'pdf_toolkit_download', {
  'event_category': 'engagement',
  'event_label': 'PDF merged'
});
```

---

## Implementation Order

1. **Toolbox Hub Pages** (3 files)
   - Create base structure
   - Add 5 tool cards
   - Implement responsive grid

2. **PDF Toolkit** (priority)
   - index.html with UI
   - app.js with pdf-lib integration
   - Mobile touch support

3. **Image Compressor**
   - index.html with UI
   - app.js with Canvas API
   - Batch processing

4. **QR Code Studio**
   - index.html with UI
   - app.js with qrcode-generator
   - Logo overlay feature

5. **Navigation Updates**
   - Update 3 main pages
   - Test mobile menu

6. **Server Endpoints** (optional)
   - Express server setup
   - API routes

7. **Documentation Updates**
   - sitemap.xml
   - robots.txt
   - README.md

---

## Mermaid Diagram: Toolbox Architecture

```mermaid
flowchart TB
    subgraph Client[Browser - Client Side]
        A[Toolbox Hub] --> B[Universal Converter]
        A --> C[GoogleFont2SVG]
        A --> D[PDF Toolkit]
        A --> E[Image Compressor]
        A --> F[QR Code Studio]
        
        D --> D1[pdf-lib CDN]
        E --> E1[Canvas API]
        E --> E2[JSZip CDN]
        F --> F1[qrcode-generator CDN]
    end
    
    subgraph Server[VPS - Server Side Optional]
        G[/api/pdf/merge]
        H[/api/pdf/split]
        I[/api/pdf/compress]
        J[/api/image/compress]
    end
    
    D -.->|files >50MB| G
    D -.->|files >50MB| H
    D -.->|files >50MB| I
    E -.->|quality optimization| J
    
    style A fill:#e85d26,color:#fff
    style D fill:#6366f1,color:#fff
    style E fill:#10b981,color:#fff
    style F fill:#f59e0b,color:#fff
```

---

## Translation Keys

### Czech (cs)
- `toolbox_title`: "Toolbox"
- `toolbox_subtitle`: "Free, private, client-side nástroje, které jsem postavil, protože jsem je potřeboval."
- `open_tool`: "Otevřít nástroj →"
- `free`: "ZDARMA"

### English (en)
- `toolbox_title`: "Toolbox"
- `toolbox_subtitle`: "Free, private, client-side tools I built because I needed them."
- `open_tool`: "Open tool →"
- `free`: "FREE"

### German (de)
- `toolbox_title`: "Toolbox"
- `toolbox_subtitle`: "Kostenlose, private Client-Side-Tools, die ich gebaut habe, weil ich sie brauchte."
- `open_tool`: "Tool öffnen →"
- `free`: "KOSTENLOS"

---

## Constraints Checklist

- [ ] Reuse ALL existing CSS classes from `/css/` directory
- [ ] Reuse ALL existing JS utilities from `/js/` directory
- [ ] No new frameworks (pdf-lib and qrcode-generator via CDN only)
- [ ] No external API keys
- [ ] No cookies except GA4
- [ ] No tracking beyond GA4
- [ ] All text translatable (data-i18n attributes)
- [ ] Production-ready code
- [ ] Mobile-perfect at 360px viewport
- [ ] Zero bloat

---

## User Decisions (Feb 21 2026)

### Confirmed Architecture

1. **Server Implementation**: ✅ Yes, implement Node.js Express endpoints on VPS for:
   - PDF compress (files >20MB or when compress button clicked)
   - Image Compressor (sharp-based, server preferred)

2. **PDF Compress Feature**: ✅ Server-side only using sharp/pdf-lib on VPS. Don't skip - it's the #1 requested feature.

3. **Tool Icons**: ✅ Copy exact SVG illustration style from existing convert & GoogleFont2SVG cards. Keep 48x48px with ember glow.

4. **Deployment**:
   - Static files (hub + tools) → GitHub Pages
   - API endpoints → Existing VPS (separate /api/ folder)

### Critical Corrections

1. **Navigation Updates**: Update **6 files**, not 3:
   - Root: `index.html`, `en.html`, `de.html`
   - Toolbox: `/tools/index.html`, `/tools/en.html`, `/tools/de.html`

2. **Card Class**: Use `.rds-card` + extra classes (design-system.css doesn't have `.tool-card`). Copy exact card HTML from `/tools/GoogleFont2SVG/index.html` for 100% visual match.

3. **Link Text**: Use "Toolbox" consistently across all languages (CZ, EN, DE).

4. **PDF Toolkit Strategy**:
   - Client-side (pdf-lib): merge, split, rotate, reorder, delete, thumbnails
   - Server-side only: compress (route >20MB or compress button to VPS `/api/pdf/*`)

5. **Server Endpoints Folder**: Put in separate `/api/` folder on VPS (not in GitHub Pages repo). Document Nginx proxy config.

### Repo Alignment Notes

- All new tools import `../css/riplay-design-system.css`
- Deploy static to `/var/www/riplay/tools/`
- API endpoints to separate `/api/` on VPS
- Keep converter untouched - it's the heavy general tool
- No bloat, matches unified cyberpunk design system
