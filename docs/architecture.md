# Architecture Overview

## System Architecture

RIPlay is a hybrid web application combining static pages with a dynamic tool subsystem.

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Main Site   │  │ GoogleFont  │  │ Universal Converter     │ │
│  │ (Static)    │  │ 2SVG        │  │ (Vite/TypeScript/WASM)  │ │
│  │             │  │ (Static)    │  │                         │ │
│  │ index.html  │  │             │  │ ┌─────────────────────┐ │ │
│  │ en.html     │  │ index.html  │  │ │ Format Handlers     │ │ │
│  │ de.html     │  │ index.js    │  │ │ ├── CADMeshHandler  │ │ │
│  │             │  │ i18n.js     │  │ │ ├── DXFHandler      │ │ │
│  │ css/        │  │ locales/    │  │ │ ├── FFmpegHandler   │ │ │
│  │ js/         │  │             │  │ │ ├── ImageHandler    │ │ │
│  └─────────────┘  └─────────────┘  │ │ └── ...             │ │ │
│                                     │ └─────────────────────┘ │ │
│                                     │ ┌─────────────────────┐ │ │
│                                     │ │ WASM Runtime        │ │ │
│                                     │ │ ├── FFmpeg          │ │ │
│                                     │ │ └── ImageMagick     │ │ │
│                                     │ └─────────────────────┘ │ │
│                                     └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        WEB SERVER                                │
│                    (Nginx/Apache/Static)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Component Overview

### 1. Main Website (Static)

**Technology:** Pure HTML5, CSS3, JavaScript (ES6+)

**Purpose:** Company landing page with service information

**Key Features:**
- Multilingual support (CS, EN, DE)
- SEO optimized with Schema.org structured data
- Responsive design
- PWA manifest support

**Files:**
```
├── index.html          # Czech (default)
├── en.html             # English
├── de.html             # German
├── css/style.css       # Shared styles
├── js/script.js        # Navigation, smooth scroll
└── img/icons.svg       # SVG icon sprite
```

### 2. GoogleFont2SVG Tool (Static)

**Technology:** HTML5, CSS3, JavaScript, OpenType.js

**Purpose:** Convert Google Fonts to SVG path data

**Architecture:**
```
tools/googlefont2svg/
├── index.html          # Main UI
├── index.js            # Application logic
├── index.css           # Styles
├── i18n.js             # Internationalization
├── opentype.js         # Font parsing library
├── lib/
│   ├── bezier.js       # Bezier curve utilities
│   └── browser.maker.js# SVG generation
├── locales/
│   ├── cs.json         # Czech translations
│   ├── en.json         # English translations
│   └── de.json         # German translations
└── flags/              # Language flag icons
```

### 3. Universal File Converter (Dynamic)

**Technology:** TypeScript, Vite, Three.js, WebAssembly

**Purpose:** Client-side file format conversion

**Architecture:**
```
tools/converter/
├── index.html          # Main UI
├── src/
│   ├── main.ts         # Entry point
│   ├── handlers/       # Format-specific handlers
│   │   ├── cadMesh.ts  # STL, OBJ, PLY, GLB
│   │   ├── dxfHandler.ts # DXF to SVG/PNG
│   │   ├── videoHandler.ts # Video transcoding
│   │   └── ...
│   ├── lib/            # Utilities
│   └── types/          # TypeScript definitions
├── wasm/               # WebAssembly binaries
│   ├── ffmpeg/         # FFmpeg WASM
│   └── magick/         # ImageMagick WASM
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Data Flow

### File Conversion Flow

```
┌──────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────┐
│  User    │───▶│  File Input  │───▶│ Format        │───▶│ Output   │
│  Uploads │    │  Validation  │    │ Detection     │    │ Options  │
└──────────┘    └──────────────┘    └───────────────┘    └──────────┘
                                                              │
                                                              ▼
┌──────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────┐
│  Download│◀───│  File Output │◀───│ Conversion    │◀───│ Handler  │
│  Result  │    │  Generation  │    │ Processing    │    │ Selection│
└──────────┘    └──────────────┘    └───────────────┘    └──────────┘
```

### Handler Selection Logic

```typescript
// Simplified handler selection
function selectHandler(file: File): FormatHandler {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // CAD mesh formats
  if (['stl', 'obj', 'ply', 'glb'].includes(extension)) {
    return new CADMeshHandler();
  }
  
  // 2D CAD formats
  if (extension === 'dxf') {
    return new DXFHandler();
  }
  
  // Video formats
  if (['mp4', 'webm', 'avi', 'mov'].includes(extension)) {
    return new VideoHandler();
  }
  
  // ... more handlers
}
```

## Design Decisions

### Why Separate Converter Module?

The converter is built as a separate Vite/TypeScript module rather than integrated with the main site because:

1. **Build Requirements:** Requires TypeScript compilation and WASM bundling
2. **Performance:** Code splitting for faster initial load
3. **Isolation:** Heavy WASM binaries don't impact main site performance
4. **Maintainability:** Independent versioning and deployment

### Client-Side Processing

All conversions happen in the browser because:

1. **Privacy:** User files never leave their device
2. **Cost:** No server infrastructure for processing
3. **Scalability:** Each user provides their own compute
4. **Compliance:** GDPR-friendly (no data transmission)

### SVG Icon Sprite

Icons are stored in an external SVG sprite file (`img/icons.svg`) because:

1. **Caching:** Single HTTP request, cached across all pages
2. **Consistency:** Same icons across all pages
3. **Maintainability:** Central icon management

## Security Considerations

### Content Security Policy

Recommended CSP headers:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;";
```

### WASM Security

WebAssembly runs in a sandboxed environment with the same origin policy. No special security concerns beyond standard web security practices.

## Performance Optimization

### Current Optimizations

1. **SVG Sprite:** External file for caching
2. **Code Splitting:** Vite splits converter code
3. **Lazy Loading:** WASM loaded on demand
4. **Responsive Images:** Appropriate sizes for different viewports

### Future Improvements

1. **Logo Optimization:** Convert PNG to WebP or SVG
2. **Service Worker:** Offline capability for converter
3. **CDN:** Serve static assets from CDN

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebAssembly | 57+ | 52+ | 11+ | 16+ |
| SharedArrayBuffer | 68+ | 79+ | 15.2+ | 79+ |
| ES6 Modules | 61+ | 60+ | 11+ | 16+ |

> **Note:** SharedArrayBuffer requires HTTPS and proper CORS headers in production.
