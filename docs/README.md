# RIPlay Project Documentation

## Overview

RIPlay is a multilingual website for local AI agent services, featuring free online tools including a GoogleFont2SVG converter and a Universal File Converter with CAD/CAM capabilities.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Installation Guide](./installation.md) | Setup and installation instructions |
| [Architecture Overview](./architecture.md) | System architecture and design decisions |
| [Converter Tool Guide](./converter-guide.md) | Universal File Converter documentation |
| [API Reference](./api-reference.md) | API endpoints and handlers |
| [Deployment Guide](./deployment.md) | Production deployment instructions |
| [Contributing Guidelines](./contributing.md) | How to contribute to the project |

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- Modern web browser with WebAssembly support

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Aeell/riplay.git
cd riplay

# Install converter dependencies
cd tools/converter
npm install

# Build the converter
npm run build

# Start local development server (from project root)
npx serve .
```

### Project Structure

```
riplay/
├── index.html          # Czech homepage (default)
├── en.html             # English homepage
├── de.html             # German homepage
├── css/
│   └── style.css       # Main stylesheet
├── js/
│   └── script.js       # Main JavaScript
├── img/
│   ├── icons.svg       # SVG icon sprite
│   ├── cs.png          # Czech flag icon
│   ├── en.png          # English flag icon
│   └── de.svg          # German flag icon
├── tools/
│   ├── converter/      # Universal File Converter (Vite/TypeScript)
│   └── googlefont2svg/ # GoogleFont2SVG tool
├── docs/               # Documentation
├── manifest.json       # PWA manifest
├── robots.txt          # SEO robots file
└── sitemap.xml         # SEO sitemap
```

## Features

### Main Website
- Multilingual support (Czech, English, German)
- SEO optimized with structured data (Schema.org)
- PWA ready with manifest.json
- Responsive design

### Universal File Converter
- Client-side file conversion (privacy-first)
- CAD/CAM format support (STL, OBJ, PLY, GLB, DXF)
- Media conversion (video, audio, images)
- Document conversion (PDF, SVG)
- Batch processing support

### GoogleFont2SVG
- Convert Google Fonts to SVG paths
- Multiple language support
- Customizable output

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Converter | TypeScript, Vite, Three.js |
| WASM Processing | FFmpeg, ImageMagick |
| 3D Graphics | Three.js |
| CAD Parsing | dxf-parser, opentype.js |

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

WebAssembly is required for converter functionality.

## License

This project is open source. See individual tool directories for specific license information.

## Contact

- **Email:** stanwesly@protonmail.com
- **Phone:** +420 776 479 855
- **GitHub:** https://github.com/Aeell
- **Location:** Liberec, Czech Republic
